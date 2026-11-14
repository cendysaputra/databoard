import { get, set } from 'idb-keyval';
import type { Settings } from '@/shared/types';
import { showToast } from '@/shared/ui/toast';
import { createSeed, defaultSettings, type SeedData } from './seed';
import type { DataError, DataSource } from './source';

/**
 * Browser preview implementation: data lives in IndexedDB, starting from seed content.
 * It mirrors the Rust behaviour closely enough to build UI against, nothing more.
 */

type Collection = keyof SeedData;
type Entity = SeedData[Collection][number];

const key = (name: string) => `dashboard.${name}`;

/** Writes the seed once; later visits keep whatever the user changed. */
const ready: Promise<void> = (async () => {
  if (await get(key('seeded'))) return;
  const seed = createSeed();
  await Promise.all((Object.keys(seed) as Collection[]).map((name) => set(key(name), seed[name])));
  await set(key('seeded'), true);
})();

async function load<K extends Collection>(name: K): Promise<SeedData[K]> {
  await ready;
  return (await get<SeedData[K]>(key(name))) ?? [];
}

function fail(code: string, message: string): never {
  throw { code, message } satisfies DataError;
}

function requireText(field: string, value: string): void {
  if (!value.trim()) fail('validation', `${field} is required`);
}

async function find<K extends Collection>(name: K, id: string): Promise<SeedData[K][number]> {
  const item = (await load(name)).find((row) => row.id === id);
  return item ?? fail('not_found', `${name} not found`);
}

async function insert<K extends Collection, I extends object>(
  name: K,
  input: I,
  extra: object = {},
): Promise<SeedData[K][number]> {
  const now = new Date().toISOString();
  const row = { ...extra, ...input, id: crypto.randomUUID(), created_at: now, updated_at: now };
  const rows = await load(name);
  await set(key(name), [...rows, row]);
  return row as unknown as SeedData[K][number];
}

async function patch<K extends Collection>(
  name: K,
  id: string,
  changes: object,
): Promise<SeedData[K][number]> {
  const current = await find(name, id);
  const next = { ...current, ...changes, updated_at: new Date().toISOString() } as Entity;
  const rows = (await load(name)) as Entity[];
  await set(
    key(name),
    rows.map((row) => (row.id === id ? next : row)),
  );
  return next as SeedData[K][number];
}

async function remove(name: Collection, id: string): Promise<void> {
  await find(name, id);
  const rows = (await load(name)) as Entity[];
  await set(
    key(name),
    rows.filter((row) => row.id !== id),
  );
}

export const browserSource: DataSource = {
  kind: 'browser',
  events: {
    async list({ from, to }) {
      const [start, end] = [new Date(from), new Date(to)];
      return (await load('events'))
        .filter((e) => new Date(e.start_at) < end && new Date(e.end_at) >= start)
        .sort((a, b) => a.start_at.localeCompare(b.start_at));
    },
    async create(input) {
      requireText('title', input.title);
      return insert('events', input);
    },
    async update(id, input) {
      requireText('title', input.title);
      return patch('events', id, input);
    },
    remove: (id) => remove('events', id),
  },
  reminders: {
    async list(upcomingOnly) {
      return (await load('reminders'))
        .filter((r) => !upcomingOnly || r.done_at === null)
        .sort((a, b) => a.remind_at.localeCompare(b.remind_at));
    },
    async create(input) {
      requireText('message', input.message);
      return insert('reminders', input, { done_at: null });
    },
    complete: (id) => patch('reminders', id, { done_at: new Date().toISOString() }),
    remove: (id) => remove('reminders', id),
  },
  notes: {
    async list({ limit, offset }) {
      return (await load('notes'))
        .sort(
          (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at),
        )
        .slice(offset, offset + limit);
    },
    get: (id) => find('notes', id),
    async create(input) {
      requireText('title', input.title);
      return insert('notes', input);
    },
    async update(id, input) {
      requireText('title', input.title);
      return patch('notes', id, input);
    },
    remove: (id) => remove('notes', id),
  },
  projects: {
    async list(status) {
      return (await load('projects'))
        .filter((p) => status === null || p.status === status)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    get: (id) => find('projects', id),
    async create(input) {
      requireText('title', input.title);
      return insert('projects', input);
    },
    async update(id, input) {
      requireText('title', input.title);
      return patch('projects', id, input);
    },
    remove: (id) => remove('projects', id),
  },
  settings: {
    async get() {
      return { ...defaultSettings, ...(await get<Partial<Settings>>(key('settings'))) };
    },
    async update(input) {
      requireText('app_name', input.app_name);
      await set(key('settings'), input);
      return input;
    },
  },
  async notify(title, body) {
    if ('Notification' in window) {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission === 'granted') {
        new Notification(title, { body });
        return;
      }
    }
    showToast(title, body);
  },
};

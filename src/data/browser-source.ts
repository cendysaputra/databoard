import { del, get, set } from 'idb-keyval';
import type {
  CollectionInput,
  Entry,
  EntryInput,
  FieldDef,
  Settings,
  Tag,
  TagInput,
} from '@/shared/types';
import { showToast } from '@/shared/ui/toast';
import { slugify } from '@/shared/utils/slug';
import { createSeed, defaultSettings, seedTags, type SeedData } from './seed';
import type { DataError, DataSource } from './source';

/**
 * Browser preview implementation: data lives in IndexedDB, starting from seed content.
 * It mirrors the Rust behaviour closely enough to build UI against, nothing more.
 */

type Collection = keyof SeedData;
type Entity = SeedData[Collection][number];

const key = (name: string) => `dashboard.${name}`;

/** Writes the seed once per seed version; later visits keep whatever the user changed. */
const SEED_VERSION = 5;

const ready: Promise<void> = (async () => {
  const version = await get<number>(key('seeded'));
  if (version === SEED_VERSION) return;
  if (version === 4) {
    // Version 5 added labels and note date/status: upgrade in place, keeping the user's data.
    const notes = (await get<SeedData['notes']>(key('notes'))) ?? [];
    await set(
      key('notes'),
      notes.map((note) => ({
        ...note,
        note_date: note.note_date ?? note.created_at.slice(0, 10),
        status: note.status ?? 'draft',
        label_ids: note.label_ids ?? [],
      })),
    );
    await set(key('tags'), seedTags);
    await set(key('seeded'), SEED_VERSION);
    return;
  }
  const seed = createSeed();
  await Promise.all((Object.keys(seed) as Collection[]).map((name) => set(key(name), seed[name])));
  // Saved preview settings may hold an accent from an older look; start from the defaults.
  await del(key('settings'));
  await set(key('seeded'), SEED_VERSION);
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

const pickAccents = ({ accent_color, accent_color_secondary }: Settings) => ({
  accent_color,
  accent_color_secondary,
});

/** Creates a label or renames the one with `id`; names are unique without case. */
async function saveTag(input: TagInput, id?: string): Promise<Tag> {
  requireText('name', input.name);
  const name = input.name.trim();
  const tags = await load('tags');
  if (id && !tags.some((tag) => tag.id === id)) fail('not_found', 'label not found');
  if (tags.some((tag) => tag.id !== id && tag.name.toLowerCase() === name.toLowerCase())) {
    fail('validation', `label "${name}" already exists`);
  }
  const tag: Tag = { id: id ?? crypto.randomUUID(), name, color: input.color?.trim() || null };
  await set(key('tags'), id ? tags.map((t) => (t.id === id ? tag : t)) : [...tags, tag]);
  return tag;
}

/** Name, slug and field keys checked the way the Rust side does, in short form. */
async function cleanCollection(input: CollectionInput, ownId?: string) {
  requireText('name', input.name);
  const slug = slugify(input.slug?.trim() || input.name);
  if (!slug) fail('validation', 'slug needs at least one letter or digit');
  if ((await load('collections')).some((c) => c.slug === slug && c.id !== ownId)) {
    fail('validation', `slug "${slug}" is already used`);
  }
  const keys = new Set<string>();
  for (const field of input.fields) {
    requireText('field label', field.label);
    if (!/^[a-z][a-z0-9_]*$/.test(field.key) || keys.has(field.key)) {
      fail('validation', `field key "${field.key}" is invalid or already used`);
    }
    keys.add(field.key);
    if (field.field_type === 'select' && field.options.length === 0) {
      fail('validation', `${field.label} needs at least one option`);
    }
  }
  return {
    ...input,
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
  };
}

/** Keeps the blueprint's fields only and enforces the required ones. */
function cleanEntry(fields: FieldDef[], input: EntryInput) {
  requireText('title', input.title);
  const data: Entry['data'] = {};
  for (const field of fields) {
    const value = input.data[field.key];
    const empty = value === undefined || value === null || value === '';
    if (field.field_type === 'toggle') data[field.key] = value === true;
    else if (!empty) data[field.key] = value;
    else if (field.required) fail('validation', `${field.label} is required`);
  }
  return { title: input.title.trim(), status: input.status, data };
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
    get: (id) => find('events', id),
    async create(input) {
      requireText('title', input.title);
      return insert('events', input);
    },
    async update(id, input) {
      requireText('title', input.title);
      return patch('events', id, input);
    },
    async remove(id) {
      await remove('events', id);
      const reminders = await load('reminders');
      await set(
        key('reminders'),
        reminders.filter((r) => r.event_id !== id),
      );
    },
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
    async list({ limit, offset }, labelId = null) {
      const tagIds = new Set((await load('tags')).map((tag) => tag.id));
      return (await load('notes'))
        .map((note) => ({ ...note, label_ids: note.label_ids.filter((id) => tagIds.has(id)) }))
        .filter((note) => labelId === null || note.label_ids.includes(labelId))
        .sort(
          (a, b) =>
            Number(b.pinned) - Number(a.pinned) ||
            b.note_date.localeCompare(a.note_date) ||
            b.updated_at.localeCompare(a.updated_at),
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
  tags: {
    async list() {
      return (await load('tags')).sort((a, b) => a.name.localeCompare(b.name));
    },
    create: (input) => saveTag(input),
    update: (id, input) => saveTag(input, id),
    async remove(id) {
      const tags = await load('tags');
      if (!tags.some((tag) => tag.id === id)) fail('not_found', 'label not found');
      await set(
        key('tags'),
        tags.filter((tag) => tag.id !== id),
      );
    },
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
  collections: {
    async list() {
      const entries = await load('entries');
      return (await load('collections'))
        .map((c) => ({
          ...c,
          entry_count: entries.filter((e) => e.collection_id === c.id).length,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async get(id) {
      const found = (await browserSource.collections.list()).find((c) => c.id === id);
      return found ?? fail('not_found', 'collection not found');
    },
    async create(input) {
      return insert('collections', await cleanCollection(input), { entry_count: 0 });
    },
    async update(id, input) {
      await patch('collections', id, await cleanCollection(input, id));
      return browserSource.collections.get(id);
    },
    async remove(id) {
      await remove('collections', id);
      const entries = await load('entries');
      await set(
        key('entries'),
        entries.filter((e) => e.collection_id !== id),
      );
    },
  },
  entries: {
    async list(collectionId, { limit, offset }) {
      return (await load('entries'))
        .filter((e) => e.collection_id === collectionId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(offset, offset + limit);
    },
    get: (id) => find('entries', id),
    async create(collectionId, input) {
      const collection = await find('collections', collectionId);
      return insert('entries', cleanEntry(collection.fields, input), {
        collection_id: collectionId,
      });
    },
    async update(id, input) {
      const current = await find('entries', id);
      const collection = await find('collections', current.collection_id);
      return patch('entries', id, cleanEntry(collection.fields, input));
    },
    remove: (id) => remove('entries', id),
  },
  overview: {
    async get({ now, day_starts, week_starts }) {
      const [events, notes, projects, reminders] = await Promise.all([
        load('events'),
        load('notes'),
        load('projects'),
        load('reminders'),
      ]);
      const perBucket = (bounds: string[], stamps: string[]) =>
        bounds.slice(0, -1).map((start, i) => {
          const [from, to] = [new Date(start), new Date(bounds[i + 1] ?? start)];
          return stamps.filter((s) => new Date(s) >= from && new Date(s) < to).length;
        });
      const withStatus = (status: string) => projects.filter((p) => p.status === status).length;
      return {
        events_per_day: perBucket(
          day_starts,
          events.map((e) => e.start_at),
        ),
        notes_per_week: perBucket(
          week_starts,
          notes.map((n) => n.created_at),
        ),
        next_events: events
          .filter((e) => new Date(e.end_at) >= new Date(now))
          .sort((a, b) => a.start_at.localeCompare(b.start_at))
          .slice(0, 5),
        active_reminders: reminders.filter((r) => r.done_at === null).length,
        notes_total: notes.length,
        projects_total: projects.length,
        projects_draft: withStatus('draft'),
        projects_published: withStatus('published'),
        projects_archived: withStatus('archived'),
      };
    },
  },
  settings: {
    async get() {
      const saved = await get<Partial<Settings>>(key('settings'));
      // Settings saved before the second accent existed still hold the old single accent;
      // let those pick up the current default pair.
      const stale = saved && !saved.accent_color_secondary;
      return { ...defaultSettings, ...saved, ...(stale ? pickAccents(defaultSettings) : {}) };
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

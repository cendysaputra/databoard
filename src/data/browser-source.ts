import { del, get, set } from 'idb-keyval';
import type { Settings, Tag, TagInput } from '@/shared/types';
import { showToast } from '@/shared/ui/toast';
import { toDateInput } from '@/shared/utils/datetime-input';
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
        note_date: note.note_date ?? toDateInput(note.created_at),
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

/** Whatever separates words: anything that is not a letter or a digit. */
const NOT_WORD = /[^\p{L}\p{N}]+/u;

function fail(code: string, message: string): never {
  throw { code, message } satisfies DataError;
}

function requireText(field: string, value: string): void {
  if (!value.trim()) fail('validation', `${field} is required`);
}

/** The same range check as the desktop app: an event must not end before it starts. */
function requireRange(input: { start_at: string; end_at: string }): void {
  if (new Date(input.end_at) < new Date(input.start_at)) {
    fail('validation', 'end_at must not be before start_at');
  }
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

/** First line of a note without headings or markdown markers, like the Rust side builds it. */
function excerpt(body: string): string {
  const line = body.split('\n').find((text) => text.trim() && !text.trim().startsWith('#')) ?? '';
  return line
    .trim()
    .replace(/^[-*\s[\]x>]+/i, '')
    .replace(/[*_`~]/g, '')
    .slice(0, 160);
}

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
      requireRange(input);
      return insert('events', input);
    },
    async update(id, input) {
      requireText('title', input.title);
      requireRange(input);
      return patch('events', id, input);
    },
    async remove(id) {
      await remove('events', id);
      const reminders = await load('reminders');
      await set(
        key('reminders'),
        reminders.filter((r) => r.event_id !== id),
      );
      // Notes written for the event stay, without their link to it.
      const notes = await load('notes');
      await set(
        key('notes'),
        notes.map((note) => (note.event_id === id ? { ...note, event_id: null } : note)),
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
        .slice(offset, offset + limit)
        .map(({ body_md, ...note }) => ({ ...note, excerpt: excerpt(body_md) }));
    },
    async search(query, page) {
      const words = query.toLowerCase().split(NOT_WORD).filter(Boolean);
      if (words.length === 0) return [];
      const notes = await load('notes');
      // Every word must start a word of the title or body, as the desktop full-text search does.
      const hits = new Set(
        notes
          .filter((note) => {
            const text = `${note.title} ${note.body_md}`.toLowerCase().split(NOT_WORD);
            return words.every((word) => text.some((token) => token.startsWith(word)));
          })
          .map((note) => note.id),
      );
      const all = await browserSource.notes.list({ limit: notes.length || 1, offset: 0 });
      return all.filter((note) => hits.has(note.id)).slice(page.offset, page.offset + page.limit);
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
      // Notes lose the label too, so a later save does not write the dead id back.
      const notes = await load('notes');
      await set(
        key('notes'),
        notes.map((note) =>
          note.label_ids.includes(id)
            ? { ...note, label_ids: note.label_ids.filter((label) => label !== id) }
            : note,
        ),
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
  recordings: {
    async save(name, extension, blob) {
      const fileName = `${name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'rekaman'}.${extension}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      // Give the download a moment to start before the temporary address is released.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { fileName, location: fileName };
    },
    // A web page cannot read the Downloads folder, so there is nothing to list.
    list: async () => [],
  },
  // Drive upload needs the desktop app: sign-in and upload run in Rust, not in a web page.
  drive: {
    status: async () => ({ configured: false, connected: false, account: null }),
    connect: () => fail('unsupported', 'Google Drive is only available in the desktop app'),
    disconnect: async () => {},
    upload: () => fail('unsupported', 'Google Drive is only available in the desktop app'),
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
  media: {
    // The preview has no files: the image itself is the stored path, as a data URL.
    save: (image) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(image);
      }),
    url: async (path) => path,
  },
  // The preview is a web page; reloading it is its update.
  updates: { check: async () => null, install: async () => {} },
  backup: {
    pickDir: async () => null,
    run: async () => fail('desktop_only', 'backups need the desktop app'),
    restore: async () => false,
  },
  mcp: { serverPath: async () => null },
  autostart: {
    get: async () => false,
    set: async () => fail('desktop_only', 'autostart needs the desktop app'),
  },
  // Nothing outside the page asks it to navigate.
  onNavigate: () => () => {},
  async openUrl(url) {
    window.open(url, '_blank', 'noopener');
  },
  async notify(title, body) {
    if ('Notification' in window) {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission === 'granted') {
        try {
          new Notification(title, { body });
          return;
        } catch {
          // Android Chrome allows notifications only through a service worker; fall back below.
        }
      }
    }
    showToast(title, body);
  },
};

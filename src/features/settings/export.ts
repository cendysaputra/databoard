import { data } from '@/data';
import type { Note, Page, Tag } from '@/shared/types';
import { toDateInput } from '@/shared/utils/datetime-input';
import { downloadText } from '@/shared/utils/download';

/** The largest page the backend hands out. */
const PAGE_SIZE = 200;

/** Wide enough to hold every event. */
const ALL_TIME = { from: '1970-01-01T00:00:00.000Z', to: '2999-12-31T23:59:59.999Z' };

/** Today as `YYYY-MM-DD`, for file names. */
const today = () => toDateInput(new Date());

/** Reads a paginated list to its end. */
async function allPages<T>(read: (page: Page) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await read({ limit: PAGE_SIZE, offset });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Every note with its full body (lists only carry an excerpt). */
async function allNotes(): Promise<Note[]> {
  const summaries = await allPages((page) => data.notes.list(page));
  const notes: Note[] = [];
  for (const { id } of summaries) notes.push(await data.notes.get(id));
  return notes;
}

/** Downloads everything in the app as one JSON file. */
export async function exportJson(): Promise<void> {
  const collections = await data.collections.list();
  const entries = [];
  for (const collection of collections) {
    entries.push(...(await allPages((page) => data.entries.list(collection.id, page))));
  }
  const content = {
    exported_at: new Date().toISOString(),
    settings: await data.settings.get(),
    events: await data.events.list(ALL_TIME),
    reminders: await data.reminders.list(false),
    notes: await allNotes(),
    labels: await data.tags.list(),
    projects: await data.projects.list(null),
    collections,
    entries,
  };
  downloadText(JSON.stringify(content, null, 2), `databoard-${today()}.json`, 'application/json');
}

/** Byte order mark: makes Excel read the file as UTF-8. */
const BOM = String.fromCharCode(0xfeff);

/** One CSV cell: quoted when it holds a separator, a quote or a line break. */
const cell = (value: string | number | null) => {
  const text = value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** Downloads the projects as a CSV file that spreadsheet apps open directly. */
export async function exportProjectsCsv(): Promise<void> {
  const projects = await data.projects.list(null);
  const rows = [
    [
      'title',
      'client',
      'year',
      'role',
      'kind',
      'tools',
      'url',
      'repo_url',
      'status',
      'description',
    ],
    ...projects.map((p) => [
      p.title,
      p.client,
      p.year,
      p.role,
      p.kind,
      p.stack.join('; '),
      p.url,
      p.repo_url,
      p.status,
      p.description_md,
    ]),
  ];
  const csv = rows.map((row) => row.map(cell).join(',')).join('\r\n');
  downloadText(
    `${BOM}${csv}
`,
    `databoard-projects-${today()}.csv`,
    'text/csv',
  );
}

/** A note as a markdown file: front matter with its details, then the body. */
function noteMarkdown(note: Note, labels: Tag[]): string {
  const names = labels.filter((label) => note.label_ids.includes(label.id)).map((l) => l.name);
  return [
    '---',
    `title: ${JSON.stringify(note.title)}`,
    `date: ${note.note_date}`,
    `status: ${note.status}`,
    `labels: ${JSON.stringify(names)}`,
    '---',
    '',
    note.body_md.trim(),
    '',
  ].join('\n');
}

/** A file name that is unique in `taken`: the note's day and title, without unsafe characters. */
function noteFileName(note: Note, taken: Set<string>): string {
  const title = note.title
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  const base = `${note.note_date} ${title}`.trim();
  let name = `${base}.md`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n}).md`;
  taken.add(name.toLowerCase());
  return name;
}

type DirectoryPicker = (options: { mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>;

/**
 * Writes each note as a `.md` file into a picked folder, or downloads one combined file
 * where folders cannot be written. Resolves to the count, or `null` when cancelled.
 */
export async function exportNotesMarkdown(): Promise<number | null> {
  const pick = (window as Window & { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;
  let folder: FileSystemDirectoryHandle | null = null;
  if (pick) {
    try {
      folder = await pick.call(window, { mode: 'readwrite' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      throw error;
    }
  }

  const [notes, labels] = [await allNotes(), await data.tags.list()];
  if (!folder) {
    const combined = notes.map((note) => noteMarkdown(note, labels)).join('\n');
    downloadText(combined, `databoard-notes-${today()}.md`, 'text/markdown');
    return notes.length;
  }

  const taken = new Set<string>();
  for (const note of notes) {
    const file = await folder.getFileHandle(noteFileName(note, taken), { create: true });
    const writer = await file.createWritable();
    await writer.write(noteMarkdown(note, labels));
    await writer.close();
  }
  return notes.length;
}

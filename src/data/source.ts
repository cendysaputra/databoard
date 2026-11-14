import type {
  CalendarEvent,
  Collection,
  CollectionInput,
  Entry,
  EntryInput,
  EventInput,
  EventRange,
  Note,
  NoteInput,
  Overview,
  OverviewQuery,
  Page,
  Project,
  RecordingFile,
  ProjectInput,
  ProjectStatus,
  Reminder,
  ReminderInput,
  Settings,
  Tag,
  TagInput,
} from '@/shared/types';

/** Shape of every error thrown by a data source (mirrors the Rust `AppError`). */
export interface DataError {
  code: string;
  message: string;
}

/**
 * Everything the UI can ask of the backend. Components depend on this interface only;
 * the desktop app answers through Rust, the browser preview through IndexedDB.
 */
export interface DataSource {
  /** Which implementation is active; use it to mark desktop-only features. */
  readonly kind: 'tauri' | 'browser';
  events: {
    list(range: EventRange): Promise<CalendarEvent[]>;
    get(id: string): Promise<CalendarEvent>;
    create(input: EventInput): Promise<CalendarEvent>;
    update(id: string, input: EventInput): Promise<CalendarEvent>;
    remove(id: string): Promise<void>;
  };
  reminders: {
    list(upcomingOnly: boolean): Promise<Reminder[]>;
    create(input: ReminderInput): Promise<Reminder>;
    complete(id: string): Promise<Reminder>;
    remove(id: string): Promise<void>;
  };
  notes: {
    /** With `labelId`, only notes carrying that label. */
    list(page: Page, labelId?: string | null): Promise<Note[]>;
    get(id: string): Promise<Note>;
    create(input: NoteInput): Promise<Note>;
    update(id: string, input: NoteInput): Promise<Note>;
    remove(id: string): Promise<void>;
  };
  /** Labels that can be attached to notes. */
  tags: {
    list(): Promise<Tag[]>;
    create(input: TagInput): Promise<Tag>;
    update(id: string, input: TagInput): Promise<Tag>;
    /** Also detaches the label from every note. */
    remove(id: string): Promise<void>;
  };
  projects: {
    list(status: ProjectStatus | null): Promise<Project[]>;
    get(id: string): Promise<Project>;
    create(input: ProjectInput): Promise<Project>;
    update(id: string, input: ProjectInput): Promise<Project>;
    remove(id: string): Promise<void>;
  };
  collections: {
    list(): Promise<Collection[]>;
    get(id: string): Promise<Collection>;
    create(input: CollectionInput): Promise<Collection>;
    update(id: string, input: CollectionInput): Promise<Collection>;
    /** Also removes the collection's entries. */
    remove(id: string): Promise<void>;
  };
  entries: {
    list(collectionId: string, page: Page): Promise<Entry[]>;
    get(id: string): Promise<Entry>;
    create(collectionId: string, input: EntryInput): Promise<Entry>;
    update(id: string, input: EntryInput): Promise<Entry>;
    remove(id: string): Promise<void>;
  };
  recordings: {
    /**
     * Saves a recording to the computer and says where it went. On desktop that is the
     * `Videos\\DataBoard` folder; in the browser the file is downloaded.
     */
    save(name: string, extension: 'webm' | 'mp4', blob: Blob): Promise<string>;
    /** Recordings saved on this computer, newest first. Empty in the browser. */
    list(): Promise<RecordingFile[]>;
  };
  overview: {
    get(query: OverviewQuery): Promise<Overview>;
  };
  settings: {
    get(): Promise<Settings>;
    update(input: Settings): Promise<Settings>;
  };
  /** Shows a notification: native on desktop, Web Notification or toast in the browser. */
  notify(title: string, body: string): Promise<void>;
}

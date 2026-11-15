import type {
  CalendarEvent,
  Collection,
  CollectionInput,
  DriveStatus,
  Entry,
  EntryInput,
  EventInput,
  EventRange,
  Note,
  NoteInput,
  NoteSummary,
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

/** Where a saved recording went. */
export interface SavedRecording {
  /** File name on disk; on desktop this is what Drive upload takes. */
  fileName: string;
  /** Full path on desktop, the downloaded file's name in the browser. */
  location: string;
}

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
    list(page: Page, labelId?: string | null): Promise<NoteSummary[]>;
    /** Notes whose title or body contain every word of `query`; a word may be cut short. */
    search(query: string, page: Page): Promise<NoteSummary[]>;
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
    save(name: string, extension: 'webm' | 'mp4', blob: Blob): Promise<SavedRecording>;
    /** Recordings saved on this computer, newest first. Empty in the browser. */
    list(): Promise<RecordingFile[]>;
  };
  /** Google Drive as a place to send recordings. Desktop only. */
  drive: {
    status(): Promise<DriveStatus>;
    /** Opens Google sign-in in the system browser and waits for it to finish. */
    connect(): Promise<DriveStatus>;
    disconnect(): Promise<void>;
    /** Uploads a recording saved on this computer; resolves to a link to the file in Drive. */
    upload(fileName: string): Promise<string>;
  };
  overview: {
    get(query: OverviewQuery): Promise<Overview>;
  };
  settings: {
    get(): Promise<Settings>;
    update(input: Settings): Promise<Settings>;
  };
  /** Image files kept by the app, such as project covers. */
  media: {
    /** Stores an image and resolves to the path to keep in the record (e.g. `cover_path`). */
    save(image: Blob): Promise<string>;
    /** An address an `<img>` can show for a stored path. */
    url(path: string): Promise<string>;
  };
  /** Updates of the app itself. Desktop only; nothing is installed without being asked. */
  updates: {
    /** The version of a newer release, or `null` when the app is up to date. */
    check(): Promise<string | null>;
    /** Downloads and installs the newer release, then restarts the app. */
    install(): Promise<void>;
  };
  /** Backups of the whole database. Desktop only. */
  backup: {
    /** Asks for a folder to keep backups in; `null` when the dialog was cancelled. */
    pickDir(): Promise<string | null>;
    /** Writes a backup now and resolves to the path of the file. */
    run(): Promise<string>;
    /** Asks for a backup file and replaces all data with it; `false` when cancelled. */
    restore(): Promise<boolean>;
  };
  /** The agent server (MCP) that lets AI clients read and write the data. Desktop only. */
  mcp: {
    /** Full path of the server program, or `null` where there is none (the browser). */
    serverPath(): Promise<string | null>;
  };
  /** Starting the app when the user signs in to Windows. Desktop only. */
  autostart: {
    get(): Promise<boolean>;
    /** Resolves to the new state. */
    set(enabled: boolean): Promise<boolean>;
  };
  /**
   * Calls `handler` with a path when the desktop shell asks the open window to show a page
   * (e.g. "Event baru" in the tray menu). Returns a function that stops listening.
   */
  onNavigate(handler: (path: string) => void): () => void;
  /** Opens a web address in the system browser (desktop: only `https` addresses are allowed). */
  openUrl(url: string): Promise<void>;
  /** Shows a notification: native on desktop, Web Notification or toast in the browser. */
  notify(title: string, body: string): Promise<void>;
}

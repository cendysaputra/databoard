import type {
  CalendarEvent,
  EventInput,
  EventRange,
  Note,
  NoteInput,
  Page,
  Project,
  ProjectInput,
  ProjectStatus,
  Reminder,
  ReminderInput,
  Settings,
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
    list(page: Page): Promise<Note[]>;
    get(id: string): Promise<Note>;
    create(input: NoteInput): Promise<Note>;
    update(id: string, input: NoteInput): Promise<Note>;
    remove(id: string): Promise<void>;
  };
  projects: {
    list(status: ProjectStatus | null): Promise<Project[]>;
    get(id: string): Promise<Project>;
    create(input: ProjectInput): Promise<Project>;
    update(id: string, input: ProjectInput): Promise<Project>;
    remove(id: string): Promise<void>;
  };
  settings: {
    get(): Promise<Settings>;
    update(input: Settings): Promise<Settings>;
  };
  /** Shows a notification: native on desktop, Web Notification or toast in the browser. */
  notify(title: string, body: string): Promise<void>;
}

import { invoke } from '@tauri-apps/api/core';
import type { RecordingFile } from '@/shared/types';
import type { DataSource } from './source';

/** Recordings are sent to Rust in pieces of this size, so memory use stays flat. */
const CHUNK_BYTES = 4 * 1024 * 1024;

/** Desktop implementation: every call is a thin Tauri command backed by SQLite. */
export const tauriSource: DataSource = {
  kind: 'tauri',
  events: {
    list: (range) => invoke('events_list', { range }),
    get: (id) => invoke('events_get', { id }),
    create: (input) => invoke('events_create', { input }),
    update: (id, input) => invoke('events_update', { id, input }),
    remove: (id) => invoke('events_remove', { id }),
  },
  reminders: {
    list: (upcomingOnly) => invoke('reminders_list', { upcomingOnly }),
    create: (input) => invoke('reminders_create', { input }),
    complete: (id) => invoke('reminders_complete', { id }),
    remove: (id) => invoke('reminders_remove', { id }),
  },
  notes: {
    list: (page, labelId = null) => invoke('notes_list', { page, labelId }),
    get: (id) => invoke('notes_get', { id }),
    create: (input) => invoke('notes_create', { input }),
    update: (id, input) => invoke('notes_update', { id, input }),
    remove: (id) => invoke('notes_remove', { id }),
  },
  tags: {
    list: () => invoke('tags_list'),
    create: (input) => invoke('tags_create', { input }),
    update: (id, input) => invoke('tags_update', { id, input }),
    remove: (id) => invoke('tags_remove', { id }),
  },
  projects: {
    list: (status) => invoke('projects_list', { status }),
    get: (id) => invoke('projects_get', { id }),
    create: (input) => invoke('projects_create', { input }),
    update: (id, input) => invoke('projects_update', { id, input }),
    remove: (id) => invoke('projects_remove', { id }),
  },
  collections: {
    list: () => invoke('collections_list'),
    get: (id) => invoke('collections_get', { id }),
    create: (input) => invoke('collections_create', { input }),
    update: (id, input) => invoke('collections_update', { id, input }),
    remove: (id) => invoke('collections_remove', { id }),
  },
  entries: {
    list: (collectionId, page) => invoke('entries_list', { collectionId, page }),
    get: (id) => invoke('entries_get', { id }),
    create: (collectionId, input) => invoke('entries_create', { collectionId, input }),
    update: (id, input) => invoke('entries_update', { id, input }),
    remove: (id) => invoke('entries_remove', { id }),
  },
  recordings: {
    async save(name, extension, blob) {
      const file = await invoke<RecordingFile>('recordings_begin', { name, extension });
      for (let start = 0; start < blob.size; start += CHUNK_BYTES) {
        const chunk = await blob.slice(start, start + CHUNK_BYTES).arrayBuffer();
        await invoke('recordings_append', chunk, { headers: { 'x-file-name': file.file_name } });
      }
      return file.path;
    },
    list: () => invoke('recordings_list'),
  },
  overview: {
    get: (query) => invoke('overview_get', { query }),
  },
  settings: {
    get: () => invoke('settings_get'),
    update: (input) => invoke('settings_update', { input }),
  },
  async notify(title, body) {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification');
    const granted = (await isPermissionGranted()) || (await requestPermission()) === 'granted';
    if (granted) sendNotification({ title, body });
  },
};

import { invoke } from '@tauri-apps/api/core';
import type { DataSource } from './source';

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
    list: (page) => invoke('notes_list', { page }),
    get: (id) => invoke('notes_get', { id }),
    create: (input) => invoke('notes_create', { input }),
    update: (id, input) => invoke('notes_update', { id, input }),
    remove: (id) => invoke('notes_remove', { id }),
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

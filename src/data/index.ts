import { isTauri } from '@tauri-apps/api/core';
import type { DataSource } from './source';
import { tauriSource } from './tauri-source';

/**
 * The active data source: Rust + SQLite inside the app, IndexedDB in a plain browser.
 *
 * The Tauri CLI sets `TAURI_ENV_PLATFORM` while it builds, so in the desktop build the
 * first condition is a constant and the browser implementation (with its seed data and
 * IndexedDB helper) is left out of the bundle entirely.
 */
export const data: DataSource =
  import.meta.env.TAURI_ENV_PLATFORM || isTauri()
    ? tauriSource
    : (await import('./browser-source')).browserSource;

export type { DataError, DataSource, SavedRecording } from './source';

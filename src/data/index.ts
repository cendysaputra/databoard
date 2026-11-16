import { isTauri } from '@tauri-apps/api/core';
import type { DataSource } from './source';
import { tauriSource } from './tauri-source';

/**
 * The active data source: Rust + SQLite inside the app, IndexedDB in a plain browser.
 * `TAURI_ENV_PLATFORM` is constant in the desktop build, which drops the browser source from it.
 */
export const data: DataSource =
  import.meta.env.TAURI_ENV_PLATFORM || isTauri()
    ? tauriSource
    : (await import('./browser-source')).browserSource;

export type { DataError, DataSource, SavedRecording } from './source';

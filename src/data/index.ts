import { isTauri } from '@tauri-apps/api/core';
import { browserSource } from './browser-source';
import type { DataSource } from './source';
import { tauriSource } from './tauri-source';

/** The active data source: Rust + SQLite inside the app, IndexedDB in a plain browser. */
export const data: DataSource = isTauri() ? tauriSource : browserSource;

export type { DataError, DataSource, SavedRecording } from './source';

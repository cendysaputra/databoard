/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by the Tauri CLI during `tauri dev` and `tauri build` (e.g. "windows"). */
  readonly TAURI_ENV_PLATFORM?: string;
}

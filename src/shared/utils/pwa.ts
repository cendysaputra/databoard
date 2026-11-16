import { isTauri } from '@tauri-apps/api/core';

/**
 * Registers the service worker that makes the web build installable and usable offline,
 * e.g. on a phone. The desktop app ships its files itself and does not need one.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || import.meta.env.TAURI_ENV_PLATFORM || isTauri()) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('service worker:', error);
    });
  });
}

import type { Settings, Theme } from '@/shared/types';

const STORAGE_KEY = 'dashboard.appearance';

type Appearance = Pick<Settings, 'theme' | 'accent_color'>;

/** Applies theme and accent to <html>. `system` removes the override so CSS follows the OS. */
export function applyAppearance({ theme, accent_color }: Appearance): void {
  const root = document.documentElement;
  if (theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
  root.style.setProperty('--accent', accent_color);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent_color }));
  } catch {
    // Storage can be unavailable; the appearance still applies for this session.
  }
}

/** Re-applies the last appearance before React renders, so there is no flash on start. */
export function restoreAppearance(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) applyAppearance(JSON.parse(saved) as Appearance);
  } catch {
    // Ignore a missing or broken cache; settings load shortly after.
  }
}

/** The theme a toggle should switch to, given what is currently visible. */
export function oppositeTheme(theme: Theme): Theme {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return isDark ? 'light' : 'dark';
}

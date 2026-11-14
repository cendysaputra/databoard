import type { Settings, Theme } from '@/shared/types';

const STORAGE_KEY = 'dashboard.appearance';

/** Whether a `#rrggbb` color is light enough to need dark text on top of it. */
function isLight(hex: string): boolean {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

const contrastOn = (hex: string) => (isLight(hex) ? '#111111' : '#ffffff');

type Appearance = Pick<Settings, 'theme' | 'accent_color' | 'accent_color_secondary'>;

/** Upgrade the previous default palette once; future custom colors stay available. */
const PALETTE_KEY = 'dashboard.palette-version';
export const DEFAULT_ACCENTS = { accent_color: '#111111', accent_color_secondary: '#8c8c8c' };

export function needsPaletteUpgrade(
  appearance: Pick<Appearance, 'accent_color' | 'accent_color_secondary'>,
): boolean {
  try {
    return (
      localStorage.getItem(PALETTE_KEY) !== '2' &&
      appearance.accent_color.toLowerCase() === '#6c3fc5' &&
      appearance.accent_color_secondary.toLowerCase() === '#ff8a3d'
    );
  } catch {
    return false;
  }
}

export function markPaletteCurrent(): void {
  try {
    localStorage.setItem(PALETTE_KEY, '2');
  } catch {
    /* Storage is optional. */
  }
}

/**
 * Applies theme and both accent colors to <html>. `system` removes the theme override
 * so CSS follows the OS. Each accent gets a readable text color to go on top of it.
 */
export function applyAppearance(appearance: Appearance): void {
  const { theme, accent_color, accent_color_secondary } = appearance;
  const root = document.documentElement;
  if (theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }
  root.style.setProperty('--accent', accent_color);
  root.style.setProperty('--accent-contrast', contrastOn(accent_color));
  root.style.setProperty('--accent-2', accent_color_secondary);
  root.style.setProperty('--accent-2-contrast', contrastOn(accent_color_secondary));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Storage can be unavailable; the appearance still applies for this session.
  }
}

/** Re-applies the last appearance before React renders, so there is no flash on start. */
export function restoreAppearance(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const appearance = saved ? (JSON.parse(saved) as Partial<Appearance>) : null;
    // A cache from before the second accent existed is skipped; settings load shortly after.
    if (appearance?.theme && appearance.accent_color && appearance.accent_color_secondary) {
      applyAppearance(
        needsPaletteUpgrade(appearance as Appearance)
          ? ({ ...appearance, ...DEFAULT_ACCENTS } as Appearance)
          : (appearance as Appearance),
      );
    }
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

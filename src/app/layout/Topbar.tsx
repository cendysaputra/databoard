import { Moon, Search, Sun } from 'lucide-react';
import { data } from '@/data';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { oppositeTheme } from '@/shared/utils/theme';
import { useUi } from './ui-store';

export function Topbar() {
  const openPalette = useUi((state) => state.setPaletteOpen);
  const settings = useSettings().data;
  const update = useUpdateSettings();

  return (
    <header className="flex h-(--topbar-height) shrink-0 items-center gap-3 border-b border-border px-6">
      <button
        type="button"
        onClick={() => openPalette(true)}
        className="flex h-8 w-72 max-w-full items-center gap-2 rounded-sm border border-border px-3 text-sm text-muted transition-colors hover:bg-surface-hover"
      >
        <Search aria-hidden className="size-4" />
        <span className="flex-1 truncate text-left">{t.palette.open}</span>
        <kbd className="font-mono text-xs">Ctrl K</kbd>
      </button>

      <div className="flex-1" />

      {data.kind === 'browser' && (
        <span
          title={t.common.browserMode}
          className="rounded-sm border border-border px-2 py-0.5 text-xs text-muted"
        >
          Browser
        </span>
      )}

      <Button
        variant="ghost"
        icon
        aria-label={t.theme.toggle}
        title={t.theme.toggle}
        disabled={!settings}
        onClick={() =>
          settings && update.mutate({ ...settings, theme: oppositeTheme(settings.theme) })
        }
      >
        {/* Both icons render; CSS shows the one matching the active color scheme. */}
        <Sun aria-hidden className="size-4 dark:hidden" />
        <Moon aria-hidden className="hidden size-4 dark:block" />
      </Button>
    </header>
  );
}

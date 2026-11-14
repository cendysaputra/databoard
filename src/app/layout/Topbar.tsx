import { Moon, Search, Sun } from 'lucide-react';
import { data } from '@/data';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { oppositeTheme } from '@/shared/utils/theme';
import { useUi } from './ui-store';

/** Top row of the frame: search on the left, tools on the right. */
export function Topbar() {
  const openPalette = useUi((state) => state.setPaletteOpen);
  const settings = useSettings().data;
  const update = useUpdateSettings();

  return (
    <header className="flex h-20 shrink-0 items-center gap-2 px-10">
      <Button
        variant="ghost"
        icon
        className="-ml-2.5"
        onClick={() => openPalette(true)}
        aria-label={t.palette.open}
        title={`${t.palette.open} (Ctrl K)`}
      >
        <Search aria-hidden className="size-5" />
      </Button>

      <div className="flex-1" />

      {data.kind === 'browser' && (
        <span
          title={t.common.browserMode}
          className="mr-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-text"
        >
          {t.common.browserBadge}
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
        <Sun aria-hidden className="size-5 dark:hidden" />
        <Moon aria-hidden className="hidden size-5 dark:block" />
      </Button>
    </header>
  );
}

import { Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { data } from '@/data';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { formatLongDate } from '@/shared/utils/date';
import { oppositeTheme } from '@/shared/utils/theme';
import { useUi } from './ui-store';

/** The running head of the sheet: today's date on the left, tools on the right. */
export function Topbar() {
  const openPalette = useUi((state) => state.setPaletteOpen);
  const settings = useSettings().data;
  const update = useUpdateSettings();
  const [today] = useState(() => new Date());

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-10">
      <p className="label flex-1 truncate">{formatLongDate(today)}</p>

      {data.kind === 'browser' && (
        <span title={t.common.browserMode} className="label mr-2 text-accent-text">
          {t.common.browserBadge}
        </span>
      )}

      <Button variant="ghost" onClick={() => openPalette(true)} aria-label={t.palette.open}>
        <Search aria-hidden className="size-4" />
        {t.palette.button}
        <kbd className="font-mono text-xs opacity-70">Ctrl K</kbd>
      </Button>

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

import { useNavigate } from '@tanstack/react-router';
import { Moon, PanelLeft, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { Modal } from '@/shared/ui/Modal';
import { cn } from '@/shared/utils/cn';
import { oppositeTheme } from '@/shared/utils/theme';
import { navItems } from './nav';
import { useUi } from './ui-store';

interface Command {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  run(): void;
}

/** Commands available everywhere. Modules will add their own in later phases. */
function useCommands(): Command[] {
  const navigate = useNavigate();
  const toggleSidebar = useUi((state) => state.toggleSidebar);
  const settings = useSettings().data;
  const { mutate } = useUpdateSettings();

  return useMemo(
    () => [
      ...navItems.map(({ to, label, icon }) => ({
        id: to,
        label: t.palette.goTo(label),
        icon,
        run: () => void navigate({ to }),
      })),
      ...(
        [
          ['/calendar/new', t.calendar.new],
          ['/notes/new', t.notes.new],
          ['/portfolio/new', t.portfolio.new],
        ] as const
      ).map(([to, label]) => ({ id: to, label, icon: Plus, run: () => void navigate({ to }) })),
      {
        id: 'theme',
        label: t.palette.toggleTheme,
        icon: Moon,
        run: () => settings && mutate({ ...settings, theme: oppositeTheme(settings.theme) }),
      },
      { id: 'sidebar', label: t.palette.toggleSidebar, icon: PanelLeft, run: toggleSidebar },
    ],
    [navigate, toggleSidebar, settings, mutate],
  );
}

function PaletteContent({ onDone }: { onDone(): void }) {
  const commands = useCommands();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const needle = query.trim().toLowerCase();
  const matches = commands.filter((command) => command.label.toLowerCase().includes(needle));
  const selected = Math.min(active, matches.length - 1);

  const run = (command: Command | undefined) => {
    if (!command) return;
    command.run();
    onDone();
  };

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setActive((selected + 1) % Math.max(matches.length, 1));
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setActive((selected - 1 + matches.length) % Math.max(matches.length, 1));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          run(matches[selected]);
        }
      }}
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search aria-hidden className="size-4 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          placeholder={t.palette.placeholder}
          aria-label={t.palette.open}
          className="h-12 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </div>

      <ul role="listbox" className="max-h-72 overflow-y-auto p-2">
        {matches.length === 0 && (
          <li className="px-3 py-6 text-center text-muted">{t.palette.empty}</li>
        )}
        {matches.map((command, index) => (
          <li
            key={command.id}
            role="option"
            aria-selected={index === selected}
            onMouseMove={() => setActive(index)}
            onClick={() => run(command)}
            className={cn(
              'flex h-9 cursor-pointer items-center gap-3 rounded-sm px-3',
              index === selected && 'bg-surface-hover',
            )}
          >
            <command.icon className="size-5 text-muted" />
            {command.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ctrl+K command palette. */
export function CommandPalette() {
  const open = useUi((state) => state.paletteOpen);
  const setOpen = useUi((state) => state.setPaletteOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!useUi.getState().paletteOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  return (
    <Modal open={open} onClose={() => setOpen(false)} label={t.palette.open}>
      <PaletteContent onDone={() => setOpen(false)} />
    </Modal>
  );
}

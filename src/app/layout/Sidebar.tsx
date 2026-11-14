import { Link } from '@tanstack/react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { cn } from '@/shared/utils/cn';
import { navItems } from './nav';
import { useUi } from './ui-store';

export function Sidebar() {
  const collapsed = useUi((state) => state.sidebarCollapsed);
  const toggle = useUi((state) => state.toggleSidebar);
  const appName = useSettings().data?.app_name;
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? t.nav.expand : t.nav.collapse;

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r border-border bg-surface transition-[width]',
        collapsed ? 'w-(--sidebar-width-collapsed)' : 'w-(--sidebar-width)',
      )}
    >
      <div className="flex h-(--topbar-height) items-center px-5">
        {!collapsed && <span className="truncate font-semibold">{appName}</span>}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={cn(
              'flex h-9 items-center gap-3 rounded-sm px-2.5 text-muted transition-colors',
              'hover:bg-surface-hover hover:text-text',
              'aria-[current=page]:bg-surface-hover aria-[current=page]:font-medium aria-[current=page]:text-text',
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="flex h-9 w-full items-center gap-3 rounded-sm px-2.5 text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <ToggleIcon aria-hidden className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{t.nav.collapse}</span>}
        </button>
      </div>
    </aside>
  );
}

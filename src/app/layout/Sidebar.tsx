import { Link } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { cn } from '@/shared/utils/cn';
import { navItems } from './nav';
import { useUi } from './ui-store';

const itemClass = cn(
  'nav-item group relative flex h-11 items-center gap-3 rounded-sm px-3 text-muted transition-colors',
  'hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-text',
);

/**
 * Left rail: the app name, the module menu centered vertically, and the menu button.
 * It stays in view while the window scrolls the content.
 * Collapsed, it shows icons only and the name is written vertically.
 */
export function Sidebar() {
  const collapsed = useUi((state) => state.sidebarCollapsed);
  const toggle = useUi((state) => state.toggleSidebar);
  const appName = useSettings().data?.app_name;
  const toggleLabel = collapsed ? t.nav.expand : t.nav.collapse;

  return (
    <aside
      className={cn(
        'app-sidebar sticky top-4 flex h-[calc(100dvh-2rem)] shrink-0 flex-col overflow-hidden rounded-lg border border-border transition-[width]',
        collapsed ? 'w-(--sidebar-width-collapsed)' : 'w-(--sidebar-width)',
      )}
    >
      <div
        className={cn(
          'sidebar-brand flex shrink-0 px-6 pt-8',
          collapsed ? 'justify-center' : 'h-24 items-start',
        )}
      >
        {/* The app name leads back to Beranda; it is a label, so it cannot be selected. */}
        <Link
          to="/"
          className={cn(
            'text-lg font-semibold tracking-tight whitespace-nowrap select-none',
            // Collapsed: the name runs down the rail, read from top to bottom.
            collapsed ? '[writing-mode:vertical-rl]' : 'truncate',
          )}
        >
          {appName}
        </Link>
      </div>

      <nav
        className={cn(
          'sidebar-nav flex flex-1 flex-col justify-center gap-2 overflow-y-auto px-4',
          collapsed && 'items-center',
        )}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} aria-label={label} title={label} className={itemClass}>
            <span className="nav-icon relative flex size-5 shrink-0">
              <Icon className="size-5" />
              <span aria-hidden className="nav-active-dot" />
            </span>
            {!collapsed && <span className="nav-label truncate">{label}</span>}
          </Link>
        ))}
      </nav>

      <div className={cn('sidebar-footer flex px-4 py-5', collapsed && 'justify-center')}>
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          title={toggleLabel}
          className={itemClass}
        >
          <Menu aria-hidden strokeWidth={1} className="size-6 shrink-0" />
        </button>
      </div>
    </aside>
  );
}

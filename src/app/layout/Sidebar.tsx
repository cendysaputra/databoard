import { Link } from '@tanstack/react-router';
import { ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { Fragment } from 'react';
import { useCollections } from '@/shared/hooks/use-collections';
import { useSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { LogoMark } from '@/shared/ui/icons';
import { cn } from '@/shared/utils/cn';
import { navItems } from './nav';
import { useUi } from './ui-store';

const itemClass = cn(
  'nav-item group relative flex h-11 items-center gap-3 rounded-sm px-3 text-muted transition-colors',
  'hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-accent-contrast',
);

const subItemClass = cn(
  'truncate rounded-sm px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-text',
  'aria-[current=page]:font-medium aria-[current=page]:text-text',
);

/** Left rail: logo and module icons. Expanded, it also shows labels and the collections. */
export function Sidebar() {
  const collapsed = useUi((state) => state.sidebarCollapsed);
  const toggle = useUi((state) => state.toggleSidebar);
  const appName = useSettings().data?.app_name;
  const collections = useCollections().data ?? [];
  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;
  const toggleLabel = collapsed ? t.nav.expand : t.nav.collapse;

  return (
    <aside
      className={cn(
        'app-sidebar relative flex shrink-0 flex-col overflow-hidden border-r border-border transition-[width]',
        collapsed ? 'w-(--sidebar-width-collapsed)' : 'w-(--sidebar-width)',
      )}
    >
      <div className="sidebar-brand flex h-24 shrink-0 items-center gap-2.5 px-6">
        <LogoMark className="size-8 shrink-0" />
        {!collapsed && (
          <span className="truncate text-lg font-semibold tracking-tight">{appName}</span>
        )}
      </div>

      <nav
        className={cn(
          'sidebar-nav flex flex-1 flex-col gap-2 overflow-y-auto px-4',
          collapsed && 'items-center',
        )}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <Fragment key={to}>
            <Link to={to} aria-label={label} title={label} className={itemClass}>
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>

            {/* The user's collections sit right under their heading. */}
            {to === '/collections' && !collapsed && (
              <div className="mb-2 ml-5 flex flex-col border-l border-border pl-2">
                {collections.map((collection) => (
                  <Link
                    key={collection.id}
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    className={subItemClass}
                  >
                    {collection.name}
                  </Link>
                ))}
                <Link
                  to="/collections/new"
                  className={cn(subItemClass, 'flex items-center gap-1.5')}
                >
                  <Plus aria-hidden className="size-3.5" />
                  {t.collections.newShort}
                </Link>
              </div>
            )}
          </Fragment>
        ))}
      </nav>

      <div className="sidebar-footer border-t border-border px-4 py-5">
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className={cn(itemClass, 'w-full')}
        >
          <ToggleIcon aria-hidden strokeWidth={1.5} className="size-5 shrink-0" />
        </button>
      </div>
    </aside>
  );
}

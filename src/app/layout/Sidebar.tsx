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
  'group relative flex h-10 items-center gap-3 rounded-sm px-2.5 text-muted transition-colors',
  'hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-text',
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
        'relative flex shrink-0 flex-col overflow-hidden transition-[width]',
        collapsed ? 'w-(--sidebar-width-collapsed)' : 'w-(--sidebar-width)',
      )}
    >
      <div className="flex h-20 shrink-0 items-center gap-2.5 px-6">
        <LogoMark className="size-8 shrink-0" />
        {!collapsed && (
          <span className="truncate text-lg font-semibold tracking-tight">{appName}</span>
        )}
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col gap-1 overflow-y-auto px-5',
          collapsed && 'justify-center',
        )}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <Fragment key={to}>
            <Link to={to} title={collapsed ? label : undefined} className={itemClass}>
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {/* Active marker: a small dot beside the icon. */}
              <span className="absolute top-1/2 -right-1 size-1 -translate-y-1/2 rounded-full bg-text opacity-0 group-aria-[current=page]:opacity-100" />
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

      <div className="px-5 py-5">
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className={cn(itemClass, 'w-full')}
        >
          <ToggleIcon aria-hidden className="size-5 shrink-0" />
        </button>
      </div>
    </aside>
  );
}

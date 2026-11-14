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

/** Navigation that sits directly on the desk, beside the sheet of content. */
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
        'flex shrink-0 flex-col overflow-hidden py-5 transition-[width]',
        collapsed ? 'w-(--sidebar-width-collapsed)' : 'w-(--sidebar-width)',
      )}
    >
      <div className="flex h-9 items-center gap-3 px-5">
        <LogoMark className="size-7 shrink-0" />
        {!collapsed && (
          <span className="truncate font-display text-xl leading-none">{appName}</span>
        )}
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Fragment key={to}>
            <Link
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex h-10 items-center gap-3 rounded-sm px-2.5 text-muted transition-colors',
                'hover:text-text aria-[current=page]:text-text',
              )}
            >
              {/* Active marker: a short accent stroke in the margin. */}
              <span className="absolute top-2.5 bottom-2.5 -left-3 w-[3px] rounded-r-full bg-accent opacity-0 transition-opacity group-aria-[current=page]:opacity-100" />
              <Icon className="size-6 shrink-0" />
              {!collapsed && (
                <span className="truncate group-aria-[current=page]:font-semibold">{label}</span>
              )}
            </Link>
            {/* The user's collections sit right under their heading. */}
            {to === '/collections' && !collapsed && (
              <div className="mb-2 ml-[1.375rem] flex flex-col border-l border-border pl-3">
                {collections.map((collection) => (
                  <Link
                    key={collection.id}
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    className="truncate rounded-sm px-2 py-1.5 text-sm text-muted transition-colors hover:text-text aria-[current=page]:font-semibold aria-[current=page]:text-text"
                  >
                    {collection.name}
                  </Link>
                ))}
                <Link
                  to="/collections/new"
                  className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-muted transition-colors hover:text-accent-text"
                >
                  <Plus aria-hidden className="size-3.5" />
                  {t.collections.newShort}
                </Link>
              </div>
            )}
          </Fragment>
        ))}
      </nav>

      <div className="px-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="flex h-9 w-full items-center gap-3 rounded-sm px-3 text-muted transition-colors hover:text-text"
        >
          <ToggleIcon aria-hidden className="size-4 shrink-0" />
        </button>
      </div>
    </aside>
  );
}

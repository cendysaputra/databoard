import { Link } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useState, type FocusEvent, type MouseEvent } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { cn } from '@/shared/utils/cn';
import { navItems } from './nav';
import { useUi } from './ui-store';

const itemClass = cn(
  'nav-item group relative flex h-11 items-center gap-3 rounded-sm px-3 text-muted transition-colors',
  'hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-text',
);

/** Gap between the rail and the tooltip, in pixels. */
const TIP_GAP = 12;

interface Tip {
  label: string;
  /** Viewport position: the left edge and the vertical middle of the tooltip. */
  left: number;
  top: number;
}

/**
 * Left rail: the app name, the module menu centered vertically, and the menu button.
 * It stays in view while the window scrolls the content.
 * Collapsed, it shows icons only and the name is written vertically; hovering an icon
 * then shows its name in a tooltip beside the rail.
 */
export function Sidebar() {
  const collapsed = useUi((state) => state.sidebarCollapsed);
  const toggle = useUi((state) => state.toggleSidebar);
  const appName = useSettings().data?.app_name;
  const toggleLabel = collapsed ? t.nav.expand : t.nav.collapse;
  const [tip, setTip] = useState<Tip | null>(null);

  /** Hover and focus handlers that show `label` beside the hovered element. */
  const tipFor = (label: string) => {
    const show = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      const item = event.currentTarget.getBoundingClientRect();
      const rail = event.currentTarget.closest('aside')?.getBoundingClientRect();
      setTip({ label, left: (rail ?? item).right + TIP_GAP, top: item.top + item.height / 2 });
    };
    const hide = () => setTip(null);
    return { onMouseEnter: show, onFocus: show, onMouseLeave: hide, onBlur: hide };
  };

  return (
    <aside
      className={cn(
        'app-sidebar sticky top-4 z-20 flex h-[calc(100dvh-2rem)] shrink-0 flex-col overflow-hidden rounded-card transition-[width]',
        collapsed ? 'w-(--sidebar-width-collapsed)' : 'w-(--sidebar-width)',
      )}
    >
      <div
        className={cn(
          'sidebar-brand flex shrink-0 pt-8',
          collapsed ? 'justify-center' : 'h-24 items-start px-6',
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
          'sidebar-nav flex flex-1 flex-col justify-center gap-2 overflow-y-auto',
          collapsed ? 'items-center px-2' : 'px-4',
        )}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={itemClass}
            // Expanded, the name is already written beside the icon.
            {...(collapsed ? tipFor(label) : {})}
          >
            <span className="nav-icon relative flex size-5 shrink-0">
              <Icon className="size-5" />
              <span aria-hidden className="nav-active-dot" />
            </span>
            {!collapsed && <span className="nav-label truncate">{label}</span>}
          </Link>
        ))}
      </nav>

      <div className={cn('sidebar-footer flex py-5', collapsed ? 'justify-center px-2' : 'px-4')}>
        <button
          type="button"
          onClick={() => {
            // The button moves when the rail resizes, so its tooltip is dropped.
            setTip(null);
            toggle();
          }}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
          className={itemClass}
          {...tipFor(toggleLabel)}
        >
          <Menu aria-hidden strokeWidth={1} className="size-6 shrink-0" />
        </button>
      </div>

      {/* Fixed to the viewport, so the rail does not clip it; the rail sits above the content. */}
      {tip && (
        <span
          role="tooltip"
          style={{ left: tip.left, top: tip.top }}
          className="nav-tooltip pointer-events-none fixed z-30 -translate-y-1/2 animate-fade rounded-[8px] bg-text px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-surface shadow-lg"
        >
          {tip.label}
        </span>
      )}
    </aside>
  );
}

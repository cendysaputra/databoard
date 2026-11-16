import { Link } from '@tanstack/react-router';
import { navItems } from './nav';

/** Phones cannot record the screen, so that module is left out where the browser lacks it. */
const canRecordScreen =
  typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
  typeof MediaRecorder !== 'undefined';

const items = navItems.filter(({ to }) => to !== '/recorder' || canRecordScreen);

/**
 * Tab bar along the bottom edge, shown in place of the sidebar on phone-sized screens
 * (see `.bottom-nav` in index.css). It sits above the home indicator of the device.
 */
export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="bottom-nav-item">
          <span className="nav-icon relative flex size-5 shrink-0">
            <Icon aria-hidden className="size-5" />
            <span aria-hidden className="nav-active-dot" />
          </span>
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

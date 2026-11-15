import { t } from '@/shared/i18n/id';
import {
  CalendarIcon,
  HomeIcon,
  NotesIcon,
  PortfolioIcon,
  RecordIcon,
  SettingsIcon,
  type Icon,
} from '@/shared/ui/icons';

interface NavItem {
  to: '/' | '/calendar' | '/notes' | '/portfolio' | '/recorder' | '/settings';
  label: string;
  icon: Icon;
}

/** The modules, in sidebar order. */
export const navItems: NavItem[] = [
  { to: '/', label: t.nav.home, icon: HomeIcon },
  { to: '/calendar', label: t.nav.calendar, icon: CalendarIcon },
  { to: '/notes', label: t.nav.notes, icon: NotesIcon },
  { to: '/portfolio', label: t.nav.portfolio, icon: PortfolioIcon },
  { to: '/recorder', label: t.nav.recorder, icon: RecordIcon },
  { to: '/settings', label: t.nav.settings, icon: SettingsIcon },
];

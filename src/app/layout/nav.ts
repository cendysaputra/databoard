import { t } from '@/shared/i18n/id';
import {
  CalendarIcon,
  CollectionIcon,
  HomeIcon,
  NotesIcon,
  PortfolioIcon,
  RecordIcon,
  SettingsIcon,
  type Icon,
} from '@/shared/ui/icons';

export interface NavItem {
  to: '/' | '/collections' | '/calendar' | '/notes' | '/portfolio' | '/recorder' | '/settings';
  label: string;
  icon: Icon;
}

/** The modules, in sidebar order. */
export const navItems: NavItem[] = [
  { to: '/', label: t.nav.home, icon: HomeIcon },
  { to: '/collections', label: t.nav.collections, icon: CollectionIcon },
  { to: '/calendar', label: t.nav.calendar, icon: CalendarIcon },
  { to: '/notes', label: t.nav.notes, icon: NotesIcon },
  { to: '/portfolio', label: t.nav.portfolio, icon: PortfolioIcon },
  { to: '/recorder', label: t.nav.recorder, icon: RecordIcon },
  { to: '/settings', label: t.nav.settings, icon: SettingsIcon },
];

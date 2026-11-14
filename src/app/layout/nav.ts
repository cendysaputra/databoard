import { CalendarDays, FolderKanban, NotebookPen, Settings, type LucideIcon } from 'lucide-react';
import { t } from '@/shared/i18n/id';

export interface NavItem {
  to: '/calendar' | '/notes' | '/portfolio' | '/settings';
  label: string;
  icon: LucideIcon;
}

/** The modules, in sidebar order. */
export const navItems: NavItem[] = [
  { to: '/calendar', label: t.nav.calendar, icon: CalendarDays },
  { to: '/notes', label: t.nav.notes, icon: NotebookPen },
  { to: '/portfolio', label: t.nav.portfolio, icon: FolderKanban },
  { to: '/settings', label: t.nav.settings, icon: Settings },
];

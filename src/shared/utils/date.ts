import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

/** "Jum, 20 Nov · 09.00" in local time. */
export function formatDateTime(iso: string): string {
  return format(new Date(iso), "EEE, d MMM '·' HH.mm", { locale: id });
}

/** "Jum, 20 Nov" in local time. */
export function formatDate(iso: string): string {
  return format(new Date(iso), 'EEE, d MMM', { locale: id });
}

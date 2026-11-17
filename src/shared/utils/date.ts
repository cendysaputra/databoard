/** Date formatting with the built-in Intl API (Indonesian), so no formatting library ships. */

const LOCALE = 'id-ID';

const formatter = (options: Intl.DateTimeFormatOptions) => {
  const intl = new Intl.DateTimeFormat(LOCALE, options);
  return (value: string | Date) => intl.format(typeof value === 'string' ? new Date(value) : value);
};

/** "Sabtu, 14 November 2026" */
export const formatLongDate = formatter({
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "November 2026" */
export const formatMonthYear = formatter({ month: 'long', year: 'numeric' });

/** "14 Nov 2026" */
export const formatDayMonthYear = formatter({ day: 'numeric', month: 'short', year: 'numeric' });

/** "Sabtu" */
export const formatWeekdayLong = formatter({ weekday: 'long' });

/** "14 Nov" */
export const formatDayMonth = formatter({ day: 'numeric', month: 'short' });

/** A stored `YYYY-MM-DD` day as a local date (plain parsing would read it as UTC). */
export const fromIsoDay = (day: string) => new Date(`${day}T00:00`);

/** "Sab" */
export const formatWeekday = formatter({ weekday: 'short' });

/** "09.00" */
export const formatTime = formatter({ hour: '2-digit', minute: '2-digit' });

/**
 * Whether an event takes up part of `day` (local time). Ends are exclusive, so an all-day event
 * ending at midnight stays off the next day; an event with no length counts on its start day.
 */
export function occursOn(event: { start_at: string; end_at: string }, day: Date): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  if (start >= dayEnd) return false;
  return end > dayStart || (+end === +start && start >= dayStart);
}

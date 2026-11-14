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

/** "14 Nov" */
export const formatDayMonth = formatter({ day: 'numeric', month: 'short' });

/** "Sab" */
export const formatWeekday = formatter({ weekday: 'short' });

/** "09.00" */
export const formatTime = formatter({ hour: '2-digit', minute: '2-digit' });

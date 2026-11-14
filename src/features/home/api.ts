import { useQuery } from '@tanstack/react-query';
import { addDays, addWeeks, startOfDay, startOfWeek } from 'date-fns';
import { data } from '@/data';

export { useCollections } from '@/shared/hooks/use-collections';

export const SCHEDULE_DAYS = 14;
export const NOTE_WEEKS = 8;
const RECENT_NOTES = 4;

/** Local-time bucket boundaries for the home charts; N buckets need N+1 boundaries. */
export function overviewBuckets(now: Date) {
  const today = startOfDay(now);
  const nextWeek = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
  return {
    days: Array.from({ length: SCHEDULE_DAYS + 1 }, (_, i) => addDays(today, i)),
    weeks: Array.from({ length: NOTE_WEEKS + 1 }, (_, i) => addWeeks(nextWeek, i - NOTE_WEEKS)),
  };
}

/** Counts and chart series for the home page, computed by the backend in one call. */
export function useOverview(now: Date) {
  const { days, weeks } = overviewBuckets(now);
  const query = {
    now: now.toISOString(),
    day_starts: days.map((day) => day.toISOString()),
    week_starts: weeks.map((week) => week.toISOString()),
  };
  return useQuery({
    queryKey: ['overview', query.day_starts[0]],
    queryFn: () => data.overview.get(query),
  });
}

/** Events between two days, for the month grid of the small calendar. */
export function useEventsBetween(from: Date, to: Date) {
  const range = { from: from.toISOString(), to: to.toISOString() };
  return useQuery({
    queryKey: ['events', 'between', range.from, range.to],
    queryFn: () => data.events.list(range),
  });
}

/** The few most recently edited notes. */
export function useRecentNotes() {
  return useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => data.notes.list({ limit: RECENT_NOTES, offset: 0 }),
  });
}

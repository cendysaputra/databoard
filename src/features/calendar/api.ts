import { useQuery } from '@tanstack/react-query';
import { endOfMonth, startOfMonth } from 'date-fns';
import { data } from '@/data';

/** Events overlapping the month that contains `day`. */
export function useMonthEvents(day: Date) {
  const range = {
    from: startOfMonth(day).toISOString(),
    to: endOfMonth(day).toISOString(),
  };
  return useQuery({
    queryKey: ['events', range.from, range.to],
    queryFn: () => data.events.list(range),
  });
}

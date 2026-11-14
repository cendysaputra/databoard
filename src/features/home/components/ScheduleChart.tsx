import { isWeekend } from 'date-fns';
import { t } from '@/shared/i18n/id';
import { cn } from '@/shared/utils/cn';
import { formatDayMonth, formatWeekday } from '@/shared/utils/date';
import { ChartTip } from './ChartTip';

interface ScheduleChartProps {
  /** First day of each bucket; `days[0]` is today. */
  days: Date[];
  /** Event count per day, same order as `days`. */
  counts: number[];
}

/** Bar chart of events per day. Today is the bar in the second accent; hover a day for its count. */
export function ScheduleChart({ days, counts }: ScheduleChartProps) {
  const max = Math.max(...counts, 1);
  const peak = counts.indexOf(Math.max(...counts));

  return (
    <ul className="flex h-44 items-stretch gap-1.5" aria-label={t.home.schedule.caption}>
      {counts.map((count, i) => {
        const day = days[i];
        if (!day) return null;
        const isToday = i === 0;
        // Only today and the busiest day carry a number; the rest are on hover.
        const showValue = count > 0 && (isToday || i === peak);
        const summary = `${formatWeekday(day)}, ${formatDayMonth(day)} · ${t.home.schedule.count(count)}`;

        return (
          <li
            key={day.toISOString()}
            tabIndex={0}
            aria-label={summary}
            className="group relative flex min-w-0 flex-1 flex-col rounded-sm outline-offset-4"
          >
            <ChartTip className="top-0">{summary}</ChartTip>

            <div className="flex flex-1 flex-col justify-end border-b border-border transition-colors group-hover:bg-surface-hover/60">
              {showValue && <span className="mb-1 text-center text-xs font-semibold">{count}</span>}
              <div
                style={{ height: `${(count / max) * 78}%` }}
                className={cn(
                  'mx-auto w-full max-w-5 rounded-t-[4px]',
                  isToday ? 'bg-accent-2' : 'bg-accent/30',
                  count === 0 && 'hidden',
                )}
              />
            </div>

            <div
              className={cn(
                'pt-2 text-center text-xs leading-tight',
                isToday ? 'font-semibold text-text' : 'text-muted',
                !isToday && isWeekend(day) && 'opacity-60',
              )}
            >
              <div>{formatWeekday(day)}</div>
              <div className="tabular-nums">{day.getDate()}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

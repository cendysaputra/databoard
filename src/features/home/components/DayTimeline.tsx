import { Link } from '@tanstack/react-router';
import { isSameDay } from 'date-fns';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { cn } from '@/shared/utils/cn';
import { formatTime } from '@/shared/utils/date';

const text = t.home.day;

const DEFAULT_START = 7;
const DEFAULT_END = 20;
const ROW_HEIGHT_REM = 3.5;
/** A chip is at least this share of the axis wide, so short events stay readable. */
const MIN_CHIP_SHARE = 0.28;

const hourOf = (value: string | Date) => {
  const date = new Date(value);
  return date.getHours() + date.getMinutes() / 60;
};
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}.00`;

interface DayTimelineProps {
  day: Date;
  /** Events that start on `day`. */
  events: CalendarEvent[];
  now: Date;
}

/** One day along an hour axis: events are chips placed at their start time. */
export function DayTimeline({ day, events, now }: DayTimelineProps) {
  const allDay = events.filter((event) => event.all_day);
  const timed = events
    .filter((event) => !event.all_day)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));

  // The axis covers working hours and stretches to fit earlier or later events.
  const axisStart = Math.min(DEFAULT_START, ...timed.map((e) => Math.floor(hourOf(e.start_at))));
  const axisEnd = Math.max(
    DEFAULT_END,
    ...timed.map((e) => (isSameDay(new Date(e.end_at), day) ? Math.ceil(hourOf(e.end_at)) : 24)),
  );
  const span = axisEnd - axisStart;
  const hours = Array.from({ length: span + 1 }, (_, i) => axisStart + i);
  const share = (hour: number) => ((hour - axisStart) / span) * 100;

  // Put each chip in the first row where it does not overlap the previous chip.
  const rowEnds: number[] = [];
  const placed = timed.map((event) => {
    const start = hourOf(event.start_at);
    const end = Math.max(isSameDay(new Date(event.end_at), day) ? hourOf(event.end_at) : 24, start);
    const reach = start + Math.max(end - start, span * MIN_CHIP_SHARE);
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= start);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = reach;
    return { event, start, row };
  });
  const rows = Math.max(rowEnds.length, 1);

  const isToday = isSameDay(day, now);
  const nowHour = hourOf(now);
  const showNow = isToday && nowHour >= axisStart && nowHour <= axisEnd;
  // On today, the running event (or else the next one) stands out.
  const highlighted =
    isToday &&
    (timed.find((e) => new Date(e.start_at) <= now && new Date(e.end_at) > now) ??
      timed.find((e) => new Date(e.start_at) > now));

  return (
    <div className="day-timeline overflow-x-auto pb-2">
      {allDay.length > 0 && (
        <ul className="mb-4 flex flex-wrap items-center gap-2">
          <li className="text-xs text-muted">{text.allDay}</li>
          {allDay.map((event) => (
            <li key={event.id}>
              <Link
                to="/calendar/$eventId"
                params={{ eventId: event.id }}
                className="block rounded-sm bg-tint-yellow px-3.5 py-1.5 text-sm font-medium"
              >
                {event.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="relative min-w-140 px-6">
        {/* Hour labels */}
        <div className="relative h-7">
          {hours.map((hour) => (
            <span
              key={hour}
              style={{ left: `${share(hour)}%` }}
              className={cn(
                'absolute -translate-x-1/2 text-xs text-muted tabular-nums',
                // With many hours on the axis, show every other label.
                span > 14 && (hour - axisStart) % 2 === 1 && 'hidden',
                // Make room for the "now" pill.
                showNow && Math.abs(hour - nowHour) < span * 0.06 && 'invisible',
              )}
            >
              {hourLabel(hour)}
            </span>
          ))}
          {showNow && (
            <span
              style={{ left: `${share(nowHour)}%` }}
              title={text.now}
              className="absolute -top-1 z-10 -translate-x-1/2 rounded-sm bg-accent px-2.5 py-1 text-xs font-medium text-accent-contrast tabular-nums"
            >
              {formatTime(now)}
            </span>
          )}
        </div>

        {/* Plot: hour lines, the "now" line and the event chips */}
        <div className="relative" style={{ height: `${rows * ROW_HEIGHT_REM + 1}rem` }}>
          {hours.map((hour) => (
            <span
              key={hour}
              style={{ left: `${share(hour)}%` }}
              className="absolute inset-y-0 border-l border-border"
            />
          ))}
          {showNow && (
            <span
              style={{ left: `${share(nowHour)}%` }}
              className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent"
            />
          )}

          {timed.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
              {text.empty}
            </p>
          )}

          {placed.map(({ event, start, row }) => {
            const active = highlighted && highlighted.id === event.id;
            return (
              <Link
                key={event.id}
                to="/calendar/$eventId"
                params={{ eventId: event.id }}
                style={{
                  // Keep chips that start late in the day inside the plot.
                  left: `min(${share(start)}%, calc(100% - 11rem))`,
                  top: `${row * ROW_HEIGHT_REM + 0.75}rem`,
                }}
                className={cn(
                  'absolute max-w-56 rounded-sm px-4 py-1.5 shadow-[0_6px_16px_-8px_rgb(23_21_43/0.35)]',
                  'transition-[translate] hover:-translate-y-0.5',
                  active ? 'bg-accent text-accent-contrast' : 'border border-border bg-surface',
                )}
              >
                <span className="block text-xs opacity-70 tabular-nums">
                  {formatTime(event.start_at)} – {formatTime(event.end_at)}
                </span>
                <span className="block truncate text-sm font-semibold">{event.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

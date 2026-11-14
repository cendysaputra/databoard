import { Link } from '@tanstack/react-router';
import { Clock, MapPin } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { cn } from '@/shared/utils/cn';
import { formatDayMonth, formatTime, formatWeekday } from '@/shared/utils/date';

const tints = ['bg-tint-sky', 'bg-tint-pink', 'bg-tint-yellow', 'bg-tint-mint'];

interface TimelineProps {
  events: CalendarEvent[];
  /** Show the date on each card (for a list that spans several days). */
  showDate: boolean;
  empty: string;
}

/** Events as soft colored cards along a time rail. */
export function Timeline({ events, showDate, empty }: TimelineProps) {
  if (events.length === 0) return <p className="text-sm text-muted">{empty}</p>;

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-3">
          <span className="w-10 shrink-0 border-t border-border pt-1 text-xs text-muted tabular-nums">
            {event.all_day ? '' : formatTime(event.start_at)}
          </span>
          <Link
            to="/calendar/$eventId"
            params={{ eventId: event.id }}
            className={cn(
              'min-w-0 flex-1 rounded-md p-4 transition-[translate] hover:-translate-y-0.5',
              tints[index % tints.length],
            )}
          >
            <p className="font-semibold">{event.title}</p>
            {event.location && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <MapPin aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium">
              <Clock aria-hidden className="size-3.5 shrink-0" />
              {showDate && `${formatWeekday(event.start_at)} ${formatDayMonth(event.start_at)} · `}
              {event.all_day
                ? t.calendar.allDay
                : `${formatTime(event.start_at)} – ${formatTime(event.end_at)}`}
            </p>
          </Link>
        </li>
      ))}
    </ol>
  );
}

import { Link } from '@tanstack/react-router';
import { Clock, MapPin } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { formatDayMonth, formatTime, formatWeekday } from '@/shared/utils/date';

interface TimelineProps {
  events: CalendarEvent[];
  showDate: boolean;
  empty: string;
}

/** A compact, neutral agenda with the same event data and destinations. */
export function Timeline({ events, showDate, empty }: TimelineProps) {
  if (events.length === 0) return <p className="text-sm leading-relaxed text-muted">{empty}</p>;

  return (
    <ol className="agenda-list">
      {events.map((event) => (
        <li key={event.id}>
          <Link to="/calendar/$eventId" params={{ eventId: event.id }} className="agenda-item">
            <div className="min-w-0">
              <p className="text-sm leading-snug font-medium">{event.title}</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                <Clock aria-hidden className="mt-0.5 size-3 shrink-0" />
                <span>
                  {showDate &&
                    `${formatWeekday(event.start_at)} ${formatDayMonth(event.start_at)} · `}
                  {event.all_day
                    ? t.calendar.allDay
                    : `${formatTime(event.start_at)} – ${formatTime(event.end_at)}`}
                </span>
              </p>
              {event.location && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin aria-hidden className="size-3 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Clock, MapPin } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import { formatDayMonth, formatTime, formatWeekday } from '@/shared/utils/date';

const text = t.home.next;

/** "2 jam lagi" and the like; the largest fitting unit, rounded down. */
function countdown(event: CalendarEvent, now: Date): string {
  const minutes = Math.floor((+new Date(event.start_at) - +now) / 60_000);
  if (minutes <= 0) return text.ongoing;
  if (minutes < 60) return text.inMinutes(minutes);
  if (minutes < 60 * 24) return text.inHours(Math.floor(minutes / 60));
  return text.inDays(Math.floor(minutes / (60 * 24)));
}

/** A quiet next-event summary; the original countdown and event links are retained. */
export function NextEventCard({ event, now }: { event: CalendarEvent | undefined; now: Date }) {
  return (
    <section className="next-event">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{text.label}</p>
        {event && (
          <span className="event-countdown">
            <Clock aria-hidden className="size-3" />
            {countdown(event, now)}
          </span>
        )}
      </div>
      {event ? (
        <>
          <h3 className="text-base leading-snug font-semibold">{event.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {formatWeekday(event.start_at)} {formatDayMonth(event.start_at)}
            {event.all_day ? ` · ${t.calendar.allDay}` : ` · ${formatTime(event.start_at)}`}
          </p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <MapPin aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
          <Link
            to="/calendar/$eventId"
            params={{ eventId: event.id }}
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium underline-offset-4 hover:underline"
          >
            {text.details}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm leading-snug font-medium">{text.none}</p>
          <Link to="/calendar/new" className={cn(buttonClass('secondary'), 'mt-4')}>
            {t.calendar.new}
          </Link>
        </>
      )}
    </section>
  );
}

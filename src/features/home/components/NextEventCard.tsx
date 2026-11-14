import { Link } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';
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

/** A hero card in the main accent that puts the next event up front. */
export function NextEventCard({ event, now }: { event: CalendarEvent | undefined; now: Date }) {
  const pill = cn(
    buttonClass('secondary'),
    'rounded-full border-0 bg-accent-2 text-accent-2-contrast',
  );

  return (
    <div className="next-event relative overflow-hidden rounded-md bg-accent p-6 text-accent-contrast">
      {/* Decoration in the corner, tinted from the card's own text color. */}
      <svg
        aria-hidden
        viewBox="0 0 120 120"
        className="absolute -top-2 -right-2 size-32 fill-current opacity-15"
      >
        <circle cx="86" cy="30" r="30" />
        <path d="M20 0h34v18a17 17 0 0 1-34 0Z" />
        <path d="M96 76l20 20-20 20-20-20Z" />
      </svg>

      <p className="relative text-xs font-medium opacity-80">{text.label}</p>
      {event ? (
        <>
          <p className="relative mt-2 text-2xl leading-tight font-semibold">{event.title}</p>
          <p className="relative mt-5 text-3xl leading-none font-semibold">
            {countdown(event, now)}
          </p>
          <p className="relative mt-2 text-sm opacity-80">
            {formatWeekday(event.start_at)} {formatDayMonth(event.start_at)}
            {!event.all_day && ` · ${formatTime(event.start_at)}`}
          </p>
          {event.location && (
            <p className="relative mt-1 flex items-center gap-1.5 text-sm opacity-80">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
          <Link
            to="/calendar/$eventId"
            params={{ eventId: event.id }}
            className={cn(pill, 'relative mt-6')}
          >
            {text.details}
          </Link>
        </>
      ) : (
        <>
          <p className="relative mt-2 text-xl leading-tight font-semibold">{text.none}</p>
          <Link to="/calendar/new" className={cn(pill, 'relative mt-6')}>
            {t.calendar.new}
          </Link>
        </>
      )}
    </div>
  );
}

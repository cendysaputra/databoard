import { Link } from '@tanstack/react-router';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import { formatLongDate, formatMonthYear, formatTime, occursOn } from '@/shared/utils/date';
import { useEventsBetween } from '../api';
import { EventRows } from './EventList';

const text = t.calendar;
const MONDAY = { weekStartsOn: 1 } as const;
/** Events listed inside one day cell before the rest is summed up as "+n lagi". */
const MAX_CHIPS = 3;

/** A month as a grid of days with their events; the picked day is listed below it. */
export function MonthView({ today }: { today: Date }) {
  // Null follows today.
  const [pickedMonth, setMonth] = useState<Date | null>(null);
  const [picked, setSelected] = useState<Date | null>(null);
  const month = pickedMonth ?? today;
  const selected = picked ?? today;

  // Whole weeks, from the Monday on or before the 1st to the Sunday on or after the last day.
  const gridStart = startOfWeek(startOfMonth(month), MONDAY);
  const gridEnd = addDays(startOfWeek(endOfMonth(month), MONDAY), 7);
  const days = Array.from({ length: differenceInCalendarDays(gridEnd, gridStart) }, (_, i) =>
    addDays(gridStart, i),
  );

  const events = useEventsBetween(gridStart, gridEnd).data ?? [];
  // Events on every day they cover, so a multi-day event shows on each of its days.
  const sorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const eventsOn = (day: Date): CalendarEvent[] => sorted.filter((event) => occursOn(event, day));
  const selectedEvents = eventsOn(selected);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold capitalize sm:text-xl">
          {formatMonthYear(month)}
        </h2>
        {/* One group, so the three controls stay together when the row wraps. */}
        <div className="flex gap-1.5">
          <Button
            className="px-3"
            onClick={() => {
              setMonth(null);
              setSelected(null);
            }}
          >
            {text.backToToday}
          </Button>
          <Button
            icon
            aria-label={t.home.calendar.previous}
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            icon
            aria-label={t.home.calendar.next}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      {/* The 1px gaps show the border color behind the cells, which draws the grid lines. */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-card bg-border">
        {t.home.calendar.weekdays.map((name) => (
          <div key={name} className="bg-surface py-2 text-center text-xs text-muted">
            {name}
          </div>
        ))}
        {days.map((day) => {
          const dayEvents = eventsOn(day);
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selected);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex min-h-16 min-w-0 flex-col gap-1 p-1.5 sm:min-h-28 sm:p-2',
                inMonth ? 'bg-surface' : 'bg-canvas',
              )}
            >
              <button
                type="button"
                aria-label={formatLongDate(day)}
                aria-pressed={isSelected}
                onClick={() => setSelected(day)}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors',
                  isToday
                    ? 'bg-accent text-accent-contrast'
                    : isSelected
                      ? 'bg-surface-hover ring-1 ring-border'
                      : 'hover:bg-surface-hover',
                  !inMonth && !isToday && 'text-muted',
                )}
              >
                {day.getDate()}
              </button>

              {/* Wide screens list the events; narrow ones only mark that there are some. */}
              <ul className="hidden flex-col gap-1 sm:flex">
                {dayEvents.slice(0, MAX_CHIPS).map((event) => (
                  <li key={event.id}>
                    <Link
                      to="/calendar/$eventId"
                      params={{ eventId: event.id }}
                      title={event.title}
                      className="block truncate rounded-[6px] bg-surface-hover px-1.5 py-0.5 text-[11px] leading-4 transition-colors hover:bg-border"
                    >
                      {!event.all_day && (
                        <span className="text-muted tabular-nums">
                          {formatTime(event.start_at)}{' '}
                        </span>
                      )}
                      {event.title}
                    </Link>
                  </li>
                ))}
                {dayEvents.length > MAX_CHIPS && (
                  <li className="px-1.5 text-[11px] leading-4 text-muted">
                    {text.more(dayEvents.length - MAX_CHIPS)}
                  </li>
                )}
              </ul>
              {dayEvents.length > 0 && (
                <span aria-hidden className="flex gap-0.5 px-2 sm:hidden">
                  {dayEvents.slice(0, MAX_CHIPS).map((event) => (
                    <span key={event.id} className="size-1 rounded-full bg-accent-2" />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">{formatLongDate(selected)}</h2>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted">{t.home.day.empty}</p>
        ) : (
          <EventRows events={selectedEvents} />
        )}
      </section>
    </div>
  );
}

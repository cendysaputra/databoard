import { Link } from '@tanstack/react-router';
import { endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type { Selection } from '@/shared/hooks/use-selection';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { Row, Rows } from '@/shared/ui/Rows';
import {
  formatDayMonth,
  formatDayMonthYear,
  formatLongDate,
  formatMonthYear,
  formatTime,
  formatWeekday,
} from '@/shared/utils/date';
import type { EventGrouping } from '../view-store';

const MONDAY = { weekStartsOn: 1 } as const;

interface EventRowsProps {
  events: CalendarEvent[];
  /** Give it to let rows be picked while selection mode is on. */
  selection?: Selection;
}

/** Events as rows: the date, the title with its location, and the time. */
export function EventRows({ events, selection }: EventRowsProps) {
  return (
    <Rows>
      {events.map((event) => (
        <Row
          key={event.id}
          select={
            selection?.active
              ? {
                  checked: selection.isSelected(event.id),
                  label: t.common.selectItem(event.title),
                  onChange: () => selection.toggle(event.id),
                }
              : undefined
          }
          lead={`${formatWeekday(event.start_at)} ${formatDayMonth(event.start_at)}`}
          trail={
            event.all_day
              ? t.calendar.allDay
              : `${formatTime(event.start_at)}–${formatTime(event.end_at)}`
          }
        >
          <Link
            to="/calendar/$eventId"
            params={{ eventId: event.id }}
            className="font-medium after:absolute after:inset-0"
          >
            {event.title}
          </Link>
          {event.location && <span className="text-muted"> · {event.location}</span>}
        </Row>
      ))}
    </Rows>
  );
}

/** First moment of the day, week or month a date falls in. */
function groupStart(grouping: EventGrouping, date: Date): Date {
  if (grouping === 'day') return startOfDay(date);
  if (grouping === 'week') return startOfWeek(date, MONDAY);
  return startOfMonth(date);
}

/** "Minggu, 15 November 2026", "16 Nov – 22 Nov 2026" or "November 2026". */
function groupLabel(grouping: EventGrouping, start: Date): string {
  if (grouping === 'day') return formatLongDate(start);
  if (grouping === 'week') {
    return `${formatDayMonth(start)} – ${formatDayMonthYear(endOfWeek(start, MONDAY))}`;
  }
  return formatMonthYear(start);
}

interface GroupedEventsProps {
  events: CalendarEvent[];
  grouping: EventGrouping;
  selection?: Selection;
}

/** The event list under a heading per day, week or month. */
export function GroupedEvents({ events, grouping, selection }: GroupedEventsProps) {
  const sorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const groups: Array<{ start: Date; events: CalendarEvent[] }> = [];
  for (const event of sorted) {
    const start = groupStart(grouping, new Date(event.start_at));
    const last = groups[groups.length - 1];
    if (last && last.start.getTime() === start.getTime()) last.events.push(event);
    else groups.push({ start, events: [event] });
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.start.toISOString()}>
          <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold capitalize">
            {groupLabel(grouping, group.start)}
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-normal text-muted normal-case">
              {t.home.schedule.count(group.events.length)}
            </span>
          </h2>
          <EventRows events={group.events} selection={selection} />
        </section>
      ))}
    </div>
  );
}

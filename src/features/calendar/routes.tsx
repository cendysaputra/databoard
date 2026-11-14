import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CalendarIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth, formatTime, formatWeekday } from '@/shared/utils/date';
import { useMonthEvents } from './api';

/** Phase 1 placeholder: lists this month's events. Month/week/agenda views come in phase 2. */
export function CalendarPage() {
  const [today] = useState(() => new Date());
  const events = useMonthEvents(today);

  return (
    <>
      <PageHeader title={t.calendar.title} subtitle={t.calendar.subtitle} />
      <QueryBoundary query={events}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title={t.calendar.emptyTitle}
              body={t.calendar.emptyBody}
            />
          ) : (
            <Rows>
              {items.map((event) => (
                <Row
                  key={event.id}
                  lead={`${formatWeekday(event.start_at)} ${formatDayMonth(event.start_at)}`}
                  trail={
                    event.all_day
                      ? t.calendar.allDay
                      : `${formatTime(event.start_at)}–${formatTime(event.end_at)}`
                  }
                >
                  <span className="font-medium">{event.title}</span>
                  {event.location && <span className="text-muted"> · {event.location}</span>}
                </Row>
              ))}
            </Rows>
          )
        }
      </QueryBoundary>
    </>
  );
}

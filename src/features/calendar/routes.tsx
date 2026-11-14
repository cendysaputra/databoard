import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { formatDate, formatDateTime } from '@/shared/utils/date';
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
              icon={CalendarDays}
              title={t.calendar.emptyTitle}
              body={t.calendar.emptyBody}
            />
          ) : (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted">{t.calendar.upcoming}</h2>
              <ul className="flex flex-col gap-2">
                {items.map((event) => (
                  <li key={event.id}>
                    <Card className="flex items-baseline justify-between gap-4">
                      <span className="truncate font-medium">{event.title}</span>
                      <span className="shrink-0 text-sm text-muted">
                        {event.all_day
                          ? `${formatDate(event.start_at)} · ${t.calendar.allDay}`
                          : formatDateTime(event.start_at)}
                      </span>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )
        }
      </QueryBoundary>
    </>
  );
}

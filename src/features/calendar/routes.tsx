import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CalendarIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth, formatTime, formatWeekday } from '@/shared/utils/date';
import { useEvent, useEvents, useRemoveEvent, useSaveEvent, useSettings } from './api';
import { EventForm } from './components/EventForm';

/** Lists upcoming events. Month and week views come later; adding and editing work now. */
export function CalendarPage() {
  const [today] = useState(() => new Date());
  const events = useEvents(today);

  return (
    <>
      <PageHeader
        title={t.calendar.title}
        subtitle={t.calendar.subtitle}
        actions={
          <Link to="/calendar/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {t.calendar.new}
          </Link>
        }
      />
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
          )
        }
      </QueryBoundary>
    </>
  );
}

function EventEditor({ event }: { event?: CalendarEvent }) {
  const navigate = useNavigate();
  const settings = useSettings();
  const save = useSaveEvent(event?.id);
  const remove = useRemoveEvent();
  const back = () => void navigate({ to: '/calendar' });

  return (
    <>
      <PageHeader title={event ? event.title : t.calendar.new} />
      <QueryBoundary query={settings}>
        {({ default_reminder_minutes }) => (
          <EventForm
            event={event}
            defaultReminderMinutes={default_reminder_minutes}
            saving={save.isPending}
            error={save.error ?? remove.error}
            onCancel={back}
            onSubmit={(input) => save.mutate(input, { onSuccess: back })}
            extra={
              event && (
                <ConfirmButton
                  label={t.common.delete}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(event.id, { onSuccess: back })}
                />
              )
            }
          />
        )}
      </QueryBoundary>
    </>
  );
}

export function EventNewPage() {
  return <EventEditor />;
}

export function EventEditPage() {
  const { eventId = '' } = useParams({ strict: false });
  const event = useEvent(eventId);

  return (
    <QueryBoundary query={event}>
      {(value) => <EventEditor key={value.id} event={value} />}
    </QueryBoundary>
  );
}

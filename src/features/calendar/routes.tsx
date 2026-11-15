import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { CalendarDays, List, Plus } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CalendarIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Segmented } from '@/shared/ui/Segmented';
import { useEvent, useEvents, useRemoveEvent, useSaveEvent, useSettings } from './api';
import { EventForm } from './components/EventForm';
import { GroupedEvents } from './components/EventList';
import { MonthView } from './components/MonthView';
import { useCalendarView } from './view-store';

const text = t.calendar;

/** Events as a list grouped by day, week or month, or as a month grid. */
export function CalendarPage() {
  const [today] = useState(() => new Date());
  const events = useEvents(today);
  const { view, grouping, setView, setGrouping } = useCalendarView();

  return (
    <>
      <PageHeader
        title={text.title}
        actions={
          <Link to="/calendar/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {text.new}
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={text.view.label}
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: text.view.list, icon: List },
            { value: 'month', label: text.view.month, icon: CalendarDays },
          ]}
        />
        {view === 'list' && (
          // The group has no visible caption; its name is still read by screen readers.
          <Segmented
            label={text.group.label}
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: 'day', label: text.group.day },
              { value: 'week', label: text.group.week },
              { value: 'month', label: text.group.month },
            ]}
          />
        )}
      </div>

      {view === 'month' ? (
        <MonthView today={today} />
      ) : (
        <QueryBoundary query={events}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState icon={CalendarIcon} title={text.emptyTitle} body={text.emptyBody} />
            ) : (
              <GroupedEvents events={items} grouping={grouping} />
            )
          }
        </QueryBoundary>
      )}
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

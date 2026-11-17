import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { CalendarDays, List, NotebookPen, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSelection } from '@/shared/hooks/use-selection';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FormError } from '@/shared/ui/FormError';
import { CalendarIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Segmented } from '@/shared/ui/Segmented';
import { SelectionBar } from '@/shared/ui/SelectionBar';
import {
  useEvent,
  useEvents,
  useRemoveEvent,
  useRemoveEvents,
  useSaveEvent,
  useSettings,
} from './api';
import { EventForm } from './components/EventForm';
import { GroupedEvents } from './components/EventList';
import { MonthView } from './components/MonthView';
import { useCalendarView } from './view-store';

const text = t.calendar;

/** The row above the events: the view switch at the left, the view's own controls at the right. */
function Toolbar({ children }: { children?: ReactNode }) {
  const { view, setView } = useCalendarView();

  return (
    <div className="calendar-toolbar mb-6 flex flex-wrap items-center justify-between gap-3">
      <Segmented
        label={text.view.label}
        value={view}
        onChange={setView}
        options={[
          { value: 'list', label: text.view.list, icon: List },
          { value: 'month', label: text.view.month, icon: CalendarDays },
        ]}
      />
      {children && (
        <div className="calendar-tools flex flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  );
}

/** The grouped list, with the controls to regroup it and to delete several events at once. */
function ListView({ events }: { events: CalendarEvent[] }) {
  const { grouping, setGrouping } = useCalendarView();
  const selection = useSelection(events.map((event) => event.id));
  const remove = useRemoveEvents();

  if (events.length === 0) {
    return (
      <>
        <Toolbar />
        <EmptyState icon={CalendarIcon} title={text.emptyTitle} body={text.emptyBody} />
      </>
    );
  }

  return (
    <>
      <Toolbar>
        <SelectionBar
          selection={selection}
          deleting={remove.isPending}
          onDelete={(ids) => remove.mutate(ids)}
        />
        {/* The group has no visible caption; its name is still read by screen readers. */}
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
      </Toolbar>
      <FormError error={remove.error} />
      <GroupedEvents events={events} grouping={grouping} selection={selection} />
    </>
  );
}

/** Events as a list grouped by day, week or month, or as a month grid. */
export function CalendarPage() {
  const [today] = useState(() => new Date());
  const events = useEvents(today);
  const view = useCalendarView((state) => state.view);

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

      {view === 'month' ? (
        <>
          <Toolbar />
          <MonthView today={today} />
        </>
      ) : (
        <QueryBoundary query={events}>{(items) => <ListView events={items} />}</QueryBoundary>
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
      <PageHeader
        title={event ? event.title : t.calendar.new}
        actions={
          event && (
            <Link to="/notes/new" search={{ event: event.id }} className={buttonClass()}>
              <NotebookPen aria-hidden className="size-4" />
              {text.createNote}
            </Link>
          )
        }
      />
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

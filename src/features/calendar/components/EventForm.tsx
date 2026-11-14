import { addDays, addHours, startOfDay, startOfHour } from 'date-fns';
import { useState, type FormEvent, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { fromInput, toDateTimeInput } from '@/shared/utils/datetime-input';
import type { EventSave } from '../api';

const text = t.calendar.form;
const narrow = { maxWidth: '16rem' };

interface EventFormProps {
  /** The event being edited; leave out to create a new one. */
  event?: CalendarEvent;
  /** Reminder preselected for a new event, in minutes before the start. */
  defaultReminderMinutes: number;
  saving: boolean;
  error: unknown;
  onSubmit(save: EventSave): void;
  onCancel(): void;
  extra?: ReactNode;
}

export function EventForm({
  event,
  defaultReminderMinutes,
  saving,
  error,
  onSubmit,
  onCancel,
  extra,
}: EventFormProps) {
  // A new event starts at the next full hour and lasts one hour.
  const [initial] = useState(() => {
    const start = event ? new Date(event.start_at) : addHours(startOfHour(new Date()), 1);
    // An all-day event stores the midnight after its last day; edit that last day itself.
    const storedEnd = event ? new Date(event.end_at) : addHours(start, 1);
    const end = event?.all_day ? addDays(storedEnd, -1) : storedEnd;
    return { start, end };
  });
  const [title, setTitle] = useState(event?.title ?? '');
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [start, setStart] = useState(toDateTimeInput(initial.start));
  const [end, setEnd] = useState(toDateTimeInput(initial.end));
  const [location, setLocation] = useState(event?.location ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [remind, setRemind] = useState(String(defaultReminderMinutes));
  const [rangeError, setRangeError] = useState(false);

  const reminderChoices = [...new Set([defaultReminderMinutes, 10, 60, 1440])]
    .filter((minutes) => minutes > 0)
    .sort((a, b) => a - b);
  const reminderLabel = (minutes: number) =>
    text.reminderBefore(
      minutes === 60 ? text.hour : minutes === 1440 ? text.day : text.minutes(minutes),
    );

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    // All-day events run from local midnight to the midnight after the last day.
    const startAt = allDay ? startOfDay(new Date(start)) : new Date(start);
    const endAt = allDay ? addDays(startOfDay(new Date(end)), 1) : new Date(end);
    if (endAt < startAt) {
      setRangeError(true);
      return;
    }
    setRangeError(false);
    onSubmit({
      input: {
        title,
        description,
        location,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        all_day: allDay,
        color: event?.color ?? null,
      },
      remindMinutes: remind === '' ? null : Number(remind),
      reminderMessage: text.reminderMessage(title.trim()),
    });
  };

  const whenInput = allDay ? { type: 'date' } : { type: 'datetime-local' };

  return (
    <form onSubmit={submit} className="editor-panel flex flex-col gap-7">
      <FormField label={text.title} required>
        {(id) => (
          <Input
            id={id}
            required
            autoFocus={!event}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </FormField>

      <label className="flex w-fit items-center gap-2">
        <input
          type="checkbox"
          className="size-4 accent-(--accent)"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        {t.calendar.allDay}
      </label>

      <div className="form-columns flex flex-wrap gap-6">
        <FormField label={text.start} required>
          {(id) => (
            <Input
              id={id}
              required
              {...whenInput}
              style={narrow}
              value={allDay ? start.slice(0, 10) : start}
              onChange={(e) => setStart(toDateTimeInput(fromInput(e.target.value)))}
            />
          )}
        </FormField>
        <FormField label={text.end} required>
          {(id) => (
            <Input
              id={id}
              required
              {...whenInput}
              style={narrow}
              value={allDay ? end.slice(0, 10) : end}
              onChange={(e) => setEnd(toDateTimeInput(fromInput(e.target.value)))}
            />
          )}
        </FormField>
      </div>

      <FormField label={text.location}>
        {(id) => <Input id={id} value={location} onChange={(e) => setLocation(e.target.value)} />}
      </FormField>

      <FormField label={text.description}>
        {(id) => (
          <Textarea
            id={id}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </FormField>

      {!event && (
        <FormField label={text.reminder}>
          {(id) => (
            <Select
              id={id}
              style={narrow}
              value={remind}
              onChange={(e) => setRemind(e.target.value)}
            >
              <option value="">{text.reminderNone}</option>
              {reminderChoices.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {reminderLabel(minutes)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      )}

      {rangeError && (
        <p role="alert" className="text-danger">
          {text.endBeforeStart}
        </p>
      )}
      <FormError error={error} />

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {t.common.save}
        </Button>
        <Button onClick={onCancel}>{t.common.cancel}</Button>
        <div className="flex-1" />
        {extra}
      </div>
    </form>
  );
}

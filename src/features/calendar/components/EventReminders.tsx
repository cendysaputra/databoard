import { X } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import type { CalendarEvent, Reminder } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { formatDayMonthYear, formatTime } from '@/shared/utils/date';
import { useAddReminder, useEventReminders, useRemoveReminder } from '../api';
import { ReminderPicker, reminderLabel } from './ReminderPicker';

const text = t.calendar.form;

const MINUTE_MS = 60_000;

interface EventRemindersProps {
  event: CalendarEvent;
  /** The lead time from Settings, preselected for a new reminder. */
  defaultMinutes: number;
}

/** The reminders of a saved event: each can be removed, and more can be added. */
export function EventReminders({ event, defaultMinutes }: EventRemindersProps) {
  const reminders = useEventReminders(event.id).data ?? [];
  const add = useAddReminder();
  const remove = useRemoveReminder();
  const [minutes, setMinutes] = useState<number | null>(defaultMinutes > 0 ? defaultMinutes : 10);
  const start = new Date(event.start_at).getTime();

  /** How long before the start a reminder fires, when that is a whole number of minutes. */
  const lead = (reminder: Reminder) => {
    const before = (start - new Date(reminder.remind_at).getTime()) / MINUTE_MS;
    return before > 0 && Number.isInteger(before) ? reminderLabel(before) : null;
  };

  return (
    <div>
      <p className="label mb-2">{text.reminder}</p>
      {reminders.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{text.reminderEmpty}</p>
      ) : (
        <ul className="mb-3">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="flex min-h-10 flex-wrap items-center gap-x-4 text-sm">
              <span className="min-w-0 flex-1">{lead(reminder) ?? reminder.message}</span>
              <span className="text-xs text-muted tabular-nums">
                {formatDayMonthYear(reminder.remind_at)} · {formatTime(reminder.remind_at)}
                {reminder.done_at && ` · ${t.common.done}`}
              </span>
              <button
                type="button"
                aria-label={text.reminderRemove}
                title={text.reminderRemove}
                disabled={remove.isPending}
                onClick={() => remove.mutate(reminder.id)}
                className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-50"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ReminderPicker defaultMinutes={defaultMinutes} value={minutes} onChange={setMinutes} />
        <Button
          disabled={minutes === null || add.isPending}
          onClick={() => {
            if (minutes === null) return;
            add.mutate({
              event_id: event.id,
              note_id: null,
              remind_at: new Date(start - minutes * MINUTE_MS).toISOString(),
              message: text.reminderMessage(event.title),
            });
          }}
        >
          {text.reminderAdd}
        </Button>
      </div>
      <FormError error={add.error ?? remove.error} />
    </div>
  );
}

import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { formatDayMonthYear, formatTime } from '@/shared/utils/date';
import { hasOpenTasks, parseActionItems, type ActionItem } from '../action-items';
import { useCreateReminder, useNoteReminders } from '../api';

const text = t.notes.actions;

interface ActionItemsProps {
  /** The saved note the reminders belong to; leave out while the note is new. */
  noteId?: string;
  /** The note body as markdown, as it is in the editor right now. */
  body: string;
}

/**
 * The dated checklist lines of a note, each with a button that turns it into a reminder.
 * Without dated lines it only explains the syntax, and only when the note has a checklist.
 */
export function ActionItems({ noteId, body }: ActionItemsProps) {
  const items = parseActionItems(body);
  const reminders = useNoteReminders(noteId).data ?? [];
  const create = useCreateReminder();

  if (items.length === 0) {
    return hasOpenTasks(body) ? <p className="text-xs text-muted">{text.hint}</p> : null;
  }

  const reminded = (item: ActionItem) =>
    reminders.some(
      (reminder) =>
        reminder.message === item.message &&
        new Date(reminder.remind_at).getTime() === new Date(item.remindAt).getTime(),
    );

  return (
    <section className="border-t border-border pt-5">
      <h2 className="mb-2 text-sm font-medium">{text.title}</h2>
      <ul>
        {items.map((item, index) => (
          <li key={index} className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 py-1">
            <span className="min-w-0 flex-1 truncate text-sm">{item.message}</span>
            <span className="text-xs text-muted tabular-nums">
              {formatDayMonthYear(item.remindAt)} · {formatTime(item.remindAt)}
            </span>
            {reminded(item) ? (
              <span className="px-3 text-xs font-medium text-muted">{text.reminded}</span>
            ) : (
              <Button
                className="h-8 px-3 text-xs"
                disabled={!noteId || create.isPending}
                onClick={() =>
                  create.mutate({
                    event_id: null,
                    note_id: noteId ?? null,
                    remind_at: item.remindAt,
                    message: item.message,
                  })
                }
              >
                {text.remind}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!noteId && <p className="mt-2 text-xs text-muted">{text.saveFirst}</p>}
      <FormError error={create.error} />
    </section>
  );
}

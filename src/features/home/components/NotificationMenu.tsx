import { Link } from '@tanstack/react-router';
import { Bell, Check } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import { buttonClass } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import { formatDayMonth, formatTime, formatWeekday } from '@/shared/utils/date';
import { useCompleteReminder, usePendingReminders } from '../api';

const text = t.home.notifications;

/** Bell button with a dropdown of the reminders that are not done yet. */
export function NotificationMenu() {
  const reminders = usePendingReminders().data ?? [];
  const complete = useCompleteReminder();

  return (
    // Menus that share a name close each other, so only one is open at a time.
    <details name="home-menu" className="relative">
      <summary
        aria-label={text.open}
        title={text.open}
        className={cn(
          buttonClass('secondary', true),
          'relative cursor-pointer list-none bg-surface [&::-webkit-details-marker]:hidden',
        )}
      >
        <Bell aria-hidden className="size-4.5" />
        {reminders.length > 0 && (
          <span
            aria-hidden
            className="absolute top-2 right-2 size-2 rounded-full bg-text ring-2 ring-surface"
          />
        )}
      </summary>

      <div className="absolute top-12 right-0 z-20 w-64 rounded-md border border-border bg-surface p-1.5 shadow-xl sm:w-80">
        <p className="px-3 pt-2 pb-1.5 text-xs font-medium text-muted">{text.title}</p>
        {reminders.length === 0 ? (
          <p className="px-3 pt-1 pb-3 text-sm text-muted">{text.empty}</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-start gap-2 rounded-sm px-3 py-2 transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  {reminder.event_id ? (
                    <Link
                      to="/calendar/$eventId"
                      params={{ eventId: reminder.event_id }}
                      className="block text-sm leading-snug font-medium underline-offset-4 hover:underline"
                    >
                      {reminder.message}
                    </Link>
                  ) : (
                    <p className="text-sm leading-snug font-medium">{reminder.message}</p>
                  )}
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    {formatWeekday(reminder.remind_at)} {formatDayMonth(reminder.remind_at)} ·{' '}
                    {formatTime(reminder.remind_at)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={text.done}
                  title={text.done}
                  disabled={complete.isPending}
                  onClick={() => complete.mutate(reminder.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-border hover:text-text disabled:opacity-50"
                >
                  <Check aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

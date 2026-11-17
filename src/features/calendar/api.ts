import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, startOfMonth } from 'date-fns';
import { data } from '@/data';
import { useRemoveMany } from '@/shared/hooks/use-remove-many';
import { notifyDeleted, notifySaved } from '@/shared/ui/toast';
import type { EventInput, ReminderInput } from '@/shared/types';

export { useSettings } from '@/shared/hooks/use-settings';

const MONTHS_AHEAD = 6;

/** Events from the start of this month until six months from now. */
export function useEvents(today: Date) {
  const range = {
    from: startOfMonth(today).toISOString(),
    to: addMonths(today, MONTHS_AHEAD).toISOString(),
  };
  return useQuery({
    queryKey: ['events', 'list', range.from],
    queryFn: () => data.events.list(range),
  });
}

/** Events between two moments, for the month grid. */
export function useEventsBetween(from: Date, to: Date) {
  const range = { from: from.toISOString(), to: to.toISOString() };
  return useQuery({
    queryKey: ['events', 'between', range.from, range.to],
    queryFn: () => data.events.list(range),
  });
}

export function useEvent(id: string) {
  return useQuery({ queryKey: ['events', 'one', id], queryFn: () => data.events.get(id) });
}

/** Events, reminders and the home page numbers are fetched again after a change. */
function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ['events', 'reminders', 'overview'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export interface EventSave {
  input: EventInput;
  /** Minutes before the start to remind; only used when creating. */
  remindMinutes: number | null;
  reminderMessage: string;
}

/** Creates an event (optionally with one reminder), or updates the one with `id`. */
export function useSaveEvent(id?: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ input, remindMinutes, reminderMessage }: EventSave) => {
      // Moving an event moves its open reminders too; the data layer does that.
      if (id) return data.events.update(id, input);
      const event = await data.events.create(input);
      // No reminder for an event that has already begun: it would only fire at once. One that
      // starts sooner than the reminder lead still gets it, as a heads-up right away.
      if (remindMinutes !== null && new Date(event.start_at).getTime() > Date.now()) {
        const remindAt = new Date(new Date(event.start_at).getTime() - remindMinutes * 60_000);
        try {
          await data.reminders.create({
            event_id: event.id,
            note_id: null,
            remind_at: remindAt.toISOString(),
            message: reminderMessage,
          });
        } catch (error) {
          // Take the event back, so saving again does not make a second copy of it.
          await data.events.remove(event.id).catch(() => {});
          throw error;
        }
      }
      return event;
    },
    onSuccess: () => {
      notifySaved();
      return refresh();
    },
  });
}

export function useRemoveEvent() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.events.remove(id),
    // Not awaited: the page showing the removed event is left before it refetches.
    onSuccess: () => {
      notifyDeleted();
      void refresh();
    },
  });
}

/** Removes several events at once; one confirmation is shown for the whole batch. */
export function useRemoveEvents() {
  return useRemoveMany((id) => data.events.remove(id), useRefresh());
}

/** The reminders of one event, done or not, by time. */
export function useEventReminders(eventId: string) {
  return useQuery({
    queryKey: ['reminders', 'event', eventId],
    queryFn: async () => (await data.reminders.list(false)).filter((r) => r.event_id === eventId),
  });
}

export function useAddReminder() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: ReminderInput) => data.reminders.create(input),
    onSuccess: () => {
      notifySaved();
      return refresh();
    },
  });
}

export function useRemoveReminder() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.reminders.remove(id),
    onSuccess: () => {
      notifyDeleted();
      return refresh();
    },
  });
}

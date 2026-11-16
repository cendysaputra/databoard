import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, startOfMonth } from 'date-fns';
import { data } from '@/data';
import { useRemoveMany } from '@/shared/hooks/use-remove-many';
import { notifyDeleted, notifySaved } from '@/shared/ui/toast';
import type { NoteInput, ReminderInput, TagInput } from '@/shared/types';

const PAGE_SIZE = 100;

/** Events offered when linking a note: this far back and ahead of the current month. */
const EVENT_MONTHS_BACK = 3;
const EVENT_MONTHS_AHEAD = 6;

/**
 * Notes: pinned first, then newest date. With a label id, only notes carrying that label;
 * with search text, only notes that contain its words.
 */
export function useNotes(labelId: string | null, search = '') {
  const page = { limit: PAGE_SIZE, offset: 0 };
  return useQuery({
    queryKey: ['notes', 'list', labelId, search],
    queryFn: async () => {
      if (!search) return data.notes.list(page, labelId);
      const found = await data.notes.search(search, page);
      return labelId ? found.filter((note) => note.label_ids.includes(labelId)) : found;
    },
    // The list stays on screen while the next result loads, so typing does not flicker.
    placeholderData: keepPreviousData,
  });
}

export function useNote(id: string) {
  return useQuery({ queryKey: ['notes', 'one', id], queryFn: () => data.notes.get(id) });
}

/** All labels, by name. */
export function useLabels() {
  return useQuery({ queryKey: ['tags'], queryFn: () => data.tags.list() });
}

function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ['notes', 'tags', 'overview'].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
}

/** Creates a note, or updates the one with `id`. */
export function useSaveNote(id?: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: NoteInput) =>
      id ? data.notes.update(id, input) : data.notes.create(input),
    onSuccess: () => {
      notifySaved();
      return refresh();
    },
  });
}

export function useRemoveNote() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.notes.remove(id),
    // Not awaited: the page showing the removed note is left before it refetches.
    onSuccess: () => {
      notifyDeleted();
      void refresh();
    },
  });
}

/** Creates a label, or renames the one with `id`. */
export function useSaveLabel() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TagInput }) =>
      id ? data.tags.update(id, input) : data.tags.create(input),
    onSuccess: () => {
      notifySaved();
      return refresh();
    },
  });
}

/** Deletes a label; notes that carried it simply lose it. */
export function useRemoveLabel() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.tags.remove(id),
    onSuccess: () => {
      notifyDeleted();
      return refresh();
    },
  });
}

/** Removes several notes at once; one confirmation is shown for the whole batch. */
export function useRemoveNotes() {
  return useRemoveMany((id) => data.notes.remove(id), useRefresh());
}

/** Events a note can be linked to: the recent and the coming ones, by start time. */
export function useLinkableEvents() {
  const month = startOfMonth(new Date());
  const range = {
    from: addMonths(month, -EVENT_MONTHS_BACK).toISOString(),
    to: addMonths(month, EVENT_MONTHS_AHEAD).toISOString(),
  };
  return useQuery({
    queryKey: ['events', 'linkable', range.from],
    queryFn: () => data.events.list(range),
  });
}

/** One event by id; idle while there is no id. */
export function useLinkedEvent(id: string | null) {
  return useQuery({
    queryKey: ['events', 'one', id],
    queryFn: () => data.events.get(id ?? ''),
    enabled: id !== null,
  });
}

/** Reminders made from a note's action items, done or not. Idle for an unsaved note. */
export function useNoteReminders(noteId: string | undefined) {
  return useQuery({
    queryKey: ['reminders', 'note', noteId],
    queryFn: async () => (await data.reminders.list(false)).filter((r) => r.note_id === noteId),
    enabled: noteId !== undefined,
  });
}

/** Creates a reminder; the notifications and the home page numbers follow. */
export function useCreateReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReminderInput) => data.reminders.create(input),
    onSuccess: () => {
      notifySaved();
      return Promise.all(
        ['reminders', 'overview'].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
    },
  });
}

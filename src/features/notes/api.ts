import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';
import { notifyDeleted, notifySaved } from '@/shared/ui/toast';
import type { NoteInput, TagInput } from '@/shared/types';

const PAGE_SIZE = 100;

/** Notes: pinned first, then newest date. With a label id, only notes carrying that label. */
export function useNotes(labelId: string | null) {
  return useQuery({
    queryKey: ['notes', 'list', labelId],
    queryFn: () => data.notes.list({ limit: PAGE_SIZE, offset: 0 }, labelId),
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
  const refresh = useRefresh();
  return useMutation({
    // One after another: the browser store rewrites the whole list on each removal,
    // so removals running together would undo each other.
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await data.notes.remove(id);
    },
    onSuccess: () => notifyDeleted(),
    // Also after a failure, so the list shows what was really removed.
    onSettled: () => refresh(),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';
import type { NoteInput } from '@/shared/types';

const PAGE_SIZE = 100;

/** The first page of notes: pinned first, then most recently edited. */
export function useNotes() {
  return useQuery({
    queryKey: ['notes', 'list'],
    queryFn: () => data.notes.list({ limit: PAGE_SIZE, offset: 0 }),
  });
}

export function useNote(id: string) {
  return useQuery({ queryKey: ['notes', 'one', id], queryFn: () => data.notes.get(id) });
}

function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all(['notes', 'overview'].map((key) => client.invalidateQueries({ queryKey: [key] })));
}

/** Creates a note, or updates the one with `id`. */
export function useSaveNote(id?: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: NoteInput) =>
      id ? data.notes.update(id, input) : data.notes.create(input),
    onSuccess: refresh,
  });
}

export function useRemoveNote() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.notes.remove(id),
    // Not awaited: the page showing the removed note is left before it refetches.
    onSuccess: () => void refresh(),
  });
}

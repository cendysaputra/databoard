import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';
import { collectionsKey } from '@/shared/hooks/use-collections';
import type { CollectionInput, EntryInput } from '@/shared/types';

export { useCollections } from '@/shared/hooks/use-collections';

const ENTRY_PAGE_SIZE = 100;

export function useCollection(id: string) {
  return useQuery({
    queryKey: [...collectionsKey, id],
    queryFn: () => data.collections.get(id),
  });
}

/** The first page of a collection's entries, most recently edited first. */
export function useEntries(collectionId: string) {
  return useQuery({
    queryKey: ['entries', collectionId],
    queryFn: () => data.entries.list(collectionId, { limit: ENTRY_PAGE_SIZE, offset: 0 }),
  });
}

export function useEntry(id: string) {
  return useQuery({ queryKey: ['entries', 'one', id], queryFn: () => data.entries.get(id) });
}

/** After any change, collections (with their counts) and entries are fetched again. */
function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: collectionsKey }),
      client.invalidateQueries({ queryKey: ['entries'] }),
    ]);
}

/** Creates a collection, or updates the one with `id`. */
export function useSaveCollection(id?: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: CollectionInput) =>
      id ? data.collections.update(id, input) : data.collections.create(input),
    onSuccess: refresh,
  });
}

export function useRemoveCollection() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.collections.remove(id),
    // Not awaited: the page showing the removed item is left before it refetches.
    onSuccess: () => void refresh(),
  });
}

/** Creates an entry in the collection, or updates the one with `id`. */
export function useSaveEntry(collectionId: string, id?: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: EntryInput) =>
      id ? data.entries.update(id, input) : data.entries.create(collectionId, input),
    onSuccess: refresh,
  });
}

export function useRemoveEntry() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.entries.remove(id),
    onSuccess: () => void refresh(),
  });
}

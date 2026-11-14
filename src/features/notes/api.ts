import { useQuery } from '@tanstack/react-query';
import { data } from '@/data';

const PAGE_SIZE = 50;

/** The first page of notes: pinned first, then most recently edited. */
export function useNotes() {
  return useQuery({
    queryKey: ['notes', 'list'],
    queryFn: () => data.notes.list({ limit: PAGE_SIZE, offset: 0 }),
  });
}

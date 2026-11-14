import { useQuery } from '@tanstack/react-query';
import { data } from '@/data';

export const collectionsKey = ['collections'] as const;

/** All collections; shared because the sidebar and the collections module both list them. */
export function useCollections() {
  return useQuery({ queryKey: collectionsKey, queryFn: () => data.collections.list() });
}

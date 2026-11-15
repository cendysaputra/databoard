import { useMutation } from '@tanstack/react-query';
import { notifyDeleted } from '@/shared/ui/toast';

/**
 * Removes several items at once, with one confirmation for the whole batch.
 * `refresh` runs after a failure too, so the list shows what was really removed.
 */
export function useRemoveMany(remove: (id: string) => Promise<void>, refresh: () => unknown) {
  return useMutation({
    // One after another: the browser store rewrites the whole list on each removal,
    // so removals running together would undo each other.
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await remove(id);
    },
    onSuccess: () => notifyDeleted(),
    onSettled: () => refresh(),
  });
}

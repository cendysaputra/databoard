import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';
import { notifyDeleted, notifySaved } from '@/shared/ui/toast';
import type { ProjectInput } from '@/shared/types';

/** All projects in their manual order. */
export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => data.projects.list(null),
  });
}

export function useProject(id: string) {
  return useQuery({ queryKey: ['projects', 'one', id], queryFn: () => data.projects.get(id) });
}

function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ['projects', 'overview'].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
}

/** Creates a project, or updates the one with `id`. */
export function useSaveProject(id?: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      id ? data.projects.update(id, input) : data.projects.create(input),
    onSuccess: () => {
      notifySaved();
      return refresh();
    },
  });
}

export function useRemoveProject() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => data.projects.remove(id),
    // Not awaited: the page showing the removed project is left before it refetches.
    onSuccess: () => {
      notifyDeleted();
      void refresh();
    },
  });
}

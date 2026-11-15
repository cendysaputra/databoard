import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';
import { notifyDeleted, notifySaved } from '@/shared/ui/toast';
import type { ProjectInput } from '@/shared/types';
import { resizeImage } from '@/shared/utils/image';

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

/** Removes several projects at once; one confirmation is shown for the whole batch. */
export function useRemoveProjects() {
  const refresh = useRefresh();
  return useMutation({
    // One after another: the browser store rewrites the whole list on each removal,
    // so removals running together would undo each other.
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await data.projects.remove(id);
    },
    onSuccess: () => notifyDeleted(),
    // Also after a failure, so the list shows what was really removed.
    onSettled: () => refresh(),
  });
}

/** An address to show a stored cover with. Idle without a cover; never refetched. */
export function useCoverUrl(path: string | null) {
  return useQuery({
    queryKey: ['media', path],
    queryFn: () => data.media.url(path ?? ''),
    enabled: path !== null,
    staleTime: Infinity,
  });
}

/** Shrinks a picked image and stores it; resolves to the path for `cover_path`. */
export function useUploadCover() {
  return useMutation({
    mutationFn: async (file: File) => data.media.save(await resizeImage(file)),
  });
}

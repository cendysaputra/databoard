import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';
import { useRemoveMany } from '@/shared/hooks/use-remove-many';
import { notifyDeleted, notifySaved } from '@/shared/ui/toast';
import type { Project, ProjectInput } from '@/shared/types';
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
  return useRemoveMany((id) => data.projects.remove(id), useRefresh());
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

/**
 * Saves a new manual order: `ids` lists every project in the order wanted. Only the
 * projects whose place changed are written.
 */
export function useReorderProjects() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ projects, ids }: { projects: Project[]; ids: string[] }) => {
      for (const [index, id] of ids.entries()) {
        const project = projects.find((p) => p.id === id);
        if (!project || project.sort_order === index + 1) continue;
        // One after another: the browser store rewrites the whole list on each update.
        await data.projects.update(id, { ...project, sort_order: index + 1 });
      }
    },
    onSettled: () => refresh(),
  });
}

/** Opens a project's link in the system browser. */
export const openLink = (url: string) => data.openUrl(url);

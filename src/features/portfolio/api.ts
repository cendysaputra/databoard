import { useQuery } from '@tanstack/react-query';
import { data } from '@/data';

/** All projects in their manual order. */
export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => data.projects.list(null),
  });
}

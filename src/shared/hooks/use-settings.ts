import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';
import type { Settings } from '@/shared/types';

const settingsKey = ['settings'] as const;

/** App settings; shared because the layout, theme and Settings page all read them. */
export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: () => data.settings.get() });
}

/** Saves settings and shows the new values immediately (rolled back if saving fails). */
export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Settings) => data.settings.update(input),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: settingsKey });
      const previous = client.getQueryData<Settings>(settingsKey);
      client.setQueryData(settingsKey, input);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(settingsKey, context.previous);
    },
    onSuccess: (saved) => client.setQueryData(settingsKey, saved),
  });
}

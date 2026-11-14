import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';

/** Whether saved recordings can be listed (desktop only). */
export const canListRecordings = data.kind === 'tauri';

/** Recordings saved on this computer, newest first. */
export function useRecordings() {
  return useQuery({ queryKey: ['recordings'], queryFn: () => data.recordings.list() });
}

interface SaveInput {
  name: string;
  extension: 'webm' | 'mp4';
  blob: Blob;
}

/** Saves a finished recording to the computer; resolves to where it was put. */
export function useSaveRecording() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ name, extension, blob }: SaveInput) =>
      data.recordings.save(name, extension, blob),
    onSuccess: () => client.invalidateQueries({ queryKey: ['recordings'] }),
  });
}

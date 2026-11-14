import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';

/** Whether this is the desktop app, where recordings are listed and Drive can be used. */
export const isDesktop = data.kind === 'tauri';

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

/** Whether Google Drive is set up and connected, and to which account. */
export function useDriveStatus() {
  return useQuery({
    queryKey: ['drive'],
    queryFn: () => data.drive.status(),
    // The status involves a network call; no need to repeat it on every focus.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Signs in to Google in the system browser. */
export function useConnectDrive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => data.drive.connect(),
    onSuccess: (status) => client.setQueryData(['drive'], status),
  });
}

export function useDisconnectDrive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => data.drive.disconnect(),
    onSuccess: () => client.invalidateQueries({ queryKey: ['drive'] }),
  });
}

/** Opens an uploaded recording's Drive page in the system browser. */
export const openInBrowser = (url: string) => data.openUrl(url);

/** Uploads a recording saved on this computer; resolves to its link in Drive. */
export function useUploadToDrive() {
  return useMutation({ mutationFn: (fileName: string) => data.drive.upload(fileName) });
}

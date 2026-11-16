import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from '@/data';

export { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';

/** Sends a test notification through the active data source. */
export function sendTestNotification(title: string, body: string): Promise<void> {
  return data.notify(title, body);
}

/** False in the browser preview, where features of the desktop shell are only labelled. */
export const isDesktop = data.kind === 'tauri';

const autostartKey = ['autostart'] as const;

/** Whether the app starts with Windows. Idle outside the desktop app. */
export function useAutostart() {
  return useQuery({
    queryKey: autostartKey,
    queryFn: () => data.autostart.get(),
    enabled: isDesktop,
  });
}

export function useSetAutostart() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => data.autostart.set(enabled),
    onSuccess: (enabled) => client.setQueryData(autostartKey, enabled),
  });
}

/** Full path of the MCP server program; `null` in the browser preview. */
export function useMcpServerPath() {
  return useQuery({ queryKey: ['mcp', 'path'], queryFn: () => data.mcp.serverPath() });
}

/** Backups of the database; the dialogs for folders and files are opened by the desktop app. */
export const backup = data.backup;

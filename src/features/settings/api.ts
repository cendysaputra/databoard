import { data } from '@/data';

export { useSettings, useUpdateSettings } from '@/shared/hooks/use-settings';

/** Sends a test notification through the active data source. */
export function sendTestNotification(title: string, body: string): Promise<void> {
  return data.notify(title, body);
}

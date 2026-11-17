import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query';
import { data } from '@/data';
import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';

const text = t.update;

const DAY_MS = 24 * 60 * 60 * 1000;
const INSTALL_KEY = ['update', 'install'];

/**
 * Offers a newer version of the app and installs it only on request. Checked when the app
 * opens and once a day; nothing is shown outside the desktop app or when the check fails.
 */
export function UpdateBanner() {
  const version = useQuery({
    queryKey: ['update'],
    queryFn: () => data.updates.check(),
    enabled: data.kind === 'tauri',
    refetchInterval: DAY_MS,
    refetchOnWindowFocus: false,
    staleTime: DAY_MS,
  }).data;
  const install = useMutation({
    mutationKey: INSTALL_KEY,
    mutationFn: () => data.updates.install(),
  });
  // The banner remounts on every page change; an install started on another page still counts.
  const installing = useIsMutating({ mutationKey: INSTALL_KEY }) > 0;

  if (!version) return null;

  return (
    <div
      role="status"
      className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface px-5 py-3 text-sm"
    >
      <p className="font-medium">{installing ? text.installing : text.available(version)}</p>
      <Button variant="primary" disabled={installing} onClick={() => install.mutate()}>
        {text.install}
      </Button>
      <FormError error={install.error} />
    </div>
  );
}

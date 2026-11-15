import { useMutation, useQuery } from '@tanstack/react-query';
import { data } from '@/data';
import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';

const text = t.update;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Says when a newer version of the app exists and installs it on request; nothing updates
 * by itself. The check runs when the app opens and once a day after that. Outside the
 * desktop app, and whenever the check fails (e.g. offline), nothing is shown.
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
  const install = useMutation({ mutationFn: () => data.updates.install() });

  if (!version) return null;

  return (
    <div
      role="status"
      className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface px-5 py-3 text-sm"
    >
      <p className="font-medium">{install.isPending ? text.installing : text.available(version)}</p>
      <Button variant="primary" disabled={install.isPending} onClick={() => install.mutate()}>
        {text.install}
      </Button>
      <FormError error={install.error} />
    </div>
  );
}

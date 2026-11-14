import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { isDesktop, useConnectDrive, useDisconnectDrive, useDriveStatus } from './api';

const text = t.recorder.drive;

/** Shows the Google Drive connection and lets the user sign in or out. */
export function DrivePanel() {
  const status = useDriveStatus();
  const connect = useConnectDrive();
  const disconnect = useDisconnectDrive();

  return (
    <section>
      <h2 className="mb-5 text-xl font-semibold">{text.title}</h2>
      {!isDesktop ? (
        <p className="text-sm text-muted">{text.desktopOnly}</p>
      ) : (
        <QueryBoundary query={status}>
          {(drive) => {
            if (!drive.configured)
              return <p className="text-sm text-muted">{text.notConfigured}</p>;
            return (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm">
                  {connect.isPending
                    ? text.connecting
                    : drive.connected
                      ? text.connected(drive.account)
                      : text.disconnected}
                </p>
                {drive.connected ? (
                  <Button disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                    {text.disconnect}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={connect.isPending}
                    onClick={() => connect.mutate()}
                  >
                    {text.connect}
                  </Button>
                )}
                <FormError error={connect.error ?? disconnect.error} />
              </div>
            );
          }}
        </QueryBoundary>
      )}
    </section>
  );
}

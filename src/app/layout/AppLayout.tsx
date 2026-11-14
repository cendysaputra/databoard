import { Outlet, useLocation } from '@tanstack/react-router';
import { Suspense } from 'react';
import { t } from '@/shared/i18n/id';
import { Toaster } from '@/shared/ui/Toaster';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** App frame: navigation on the desk at the left, the active module on a sheet of paper. */
export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-full bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col py-2.5 pr-2.5">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            {/* The key restarts the fade whenever the route changes. */}
            <div
              key={pathname}
              className="mx-auto max-w-(--content-max-width) animate-fade px-10 pt-6 pb-16"
            >
              <Suspense fallback={<p className="text-muted">{t.common.loading}</p>}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
      <CommandPalette />
      <Toaster />
    </div>
  );
}

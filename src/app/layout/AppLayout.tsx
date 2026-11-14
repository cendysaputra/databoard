import { Outlet, useLocation } from '@tanstack/react-router';
import { Suspense } from 'react';
import { t } from '@/shared/i18n/id';
import { Toaster } from '@/shared/ui/Toaster';
import { cn } from '@/shared/utils/cn';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** App frame: a white rounded window on the canvas, with a rail at the left. */
export function AppLayout() {
  const { pathname } = useLocation();
  const wide = pathname === '/';

  return (
    <div className="app-canvas h-full bg-canvas p-4">
      <div className="app-frame relative flex h-full overflow-hidden rounded-lg border border-border bg-bg">
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="app-main flex-1 overflow-y-auto">
            {/* The key restarts the fade whenever the route changes. */}
            <div
              key={pathname}
              className={cn(
                'app-content mx-auto animate-fade px-10 pt-6 pb-14',
                wide ? 'max-w-(--content-max-width-wide)' : 'max-w-(--content-max-width)',
              )}
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

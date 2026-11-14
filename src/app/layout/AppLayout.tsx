import { Outlet, useLocation } from '@tanstack/react-router';
import { Suspense } from 'react';
import { t } from '@/shared/i18n/id';
import { Toaster } from '@/shared/ui/Toaster';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** App frame: sidebar on the left, topbar and the active module on the right. */
export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {/* The key restarts the fade whenever the route changes. */}
          <div
            key={pathname}
            className="mx-auto max-w-(--content-max-width) animate-fade px-8 py-10"
          >
            <Suspense fallback={<p className="text-muted">{t.common.loading}</p>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      <CommandPalette />
      <Toaster />
    </div>
  );
}

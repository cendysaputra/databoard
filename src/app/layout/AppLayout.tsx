import { Outlet, useLocation } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { Toaster } from '@/shared/ui/Toaster';
import { cn } from '@/shared/utils/cn';
import { CommandPalette } from './CommandPalette';
import { Onboarding } from './Onboarding';
import { Sidebar } from './Sidebar';

/** App frame: the sidebar card stays at the left while the window scrolls the content. */
export function AppLayout() {
  const { pathname } = useLocation();
  const wide = pathname === '/';
  const settings = useSettings().data;

  // A fresh install has no profile yet: ask for it before showing the app.
  if (settings && !settings.profile_name.trim()) return <Onboarding settings={settings} />;

  return (
    <div className="app-canvas min-h-full bg-canvas p-4">
      <div className="app-frame relative flex items-start gap-5">
        <Sidebar />
        <main className="app-panel min-w-0 flex-1">
          {/* The key restarts the fade whenever the route changes. */}
          <div
            key={pathname}
            className={cn(
              'app-content mx-auto animate-fade px-10 pt-12 pb-14',
              wide ? 'max-w-(--content-max-width-wide)' : 'max-w-(--content-max-width)',
            )}
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

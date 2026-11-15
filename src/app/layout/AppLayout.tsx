import { Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { Suspense, useEffect } from 'react';
import { data } from '@/data';
import { useSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import { Toaster } from '@/shared/ui/Toaster';
import { CommandPalette } from './CommandPalette';
import { Onboarding } from './Onboarding';
import { Sidebar } from './Sidebar';
import { useShortcuts } from './use-shortcuts';

/** App frame: the sidebar card stays at the left while the window scrolls the content. */
export function AppLayout() {
  const { pathname } = useLocation();
  const settings = useSettings().data;
  const onboarded = Boolean(settings?.profile_name.trim());
  // No shortcuts while the first-start profile form is the only thing on screen.
  useShortcuts(onboarded);

  // The desktop shell can ask the open window for a page, e.g. "Event baru" in the tray menu.
  const router = useRouter();
  useEffect(() => data.onNavigate((path) => router.history.push(path)), [router]);

  // A fresh install has no profile yet: ask for it before showing the app.
  if (settings && !onboarded) return <Onboarding settings={settings} />;

  return (
    <div className="app-canvas min-h-full bg-canvas p-4">
      <div className="app-frame relative flex items-start gap-5">
        <Sidebar />
        <main className="app-panel min-w-0 flex-1">
          {/* The key restarts the fade whenever the route changes. */}
          <div
            key={pathname}
            className="app-content mx-auto max-w-(--content-max-width) animate-fade px-10 pt-12 pb-14"
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

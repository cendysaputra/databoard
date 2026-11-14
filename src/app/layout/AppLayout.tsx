import { Outlet, useLocation } from '@tanstack/react-router';
import { Suspense } from 'react';
import { t } from '@/shared/i18n/id';
import { Toaster } from '@/shared/ui/Toaster';
import { cn } from '@/shared/utils/cn';
import { CommandPalette } from './CommandPalette';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Faint geometric shapes at the top of the frame; decoration only. */
function FrameArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 110"
      className="pointer-events-none absolute top-0 left-1/2 h-28 -translate-x-1/4 fill-surface-hover"
    >
      <circle cx="40" cy="6" r="34" />
      <path d="M96 0h56v28a28 28 0 0 1-56 0Z" />
      <circle cx="198" cy="20" r="26" />
      <path d="M240 0h64a32 32 0 0 1-64 0Z" />
      <path d="M96 62h50v22a25 25 0 0 1-50 0Z" opacity=".7" />
      <path d="M176 60l24 24-24 24-24-24Z" opacity=".7" />
      <path d="M232 58h44v44a44 44 0 0 1-44-44Z" opacity=".7" />
    </svg>
  );
}

/** App frame: a white rounded window on the canvas, with a rail at the left. */
export function AppLayout() {
  const { pathname } = useLocation();
  const wide = pathname === '/';

  return (
    <div className="h-full bg-linear-to-br from-canvas to-canvas-2 p-3">
      <div className="relative flex h-full overflow-hidden rounded-lg bg-bg shadow-[0_20px_60px_-30px_rgb(23_21_43/0.35)]">
        <FrameArt />
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            {/* The key restarts the fade whenever the route changes. */}
            <div
              key={pathname}
              className={cn(
                'mx-auto animate-fade px-10 pt-2 pb-14',
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

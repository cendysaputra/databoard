import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import { AppLayout } from './layout/AppLayout';

const rootRoute = createRootRoute({ component: AppLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/calendar' });
  },
});

// Each module is its own chunk, loaded when its route is first opened.
const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: lazyRouteComponent(() => import('@/features/calendar/routes'), 'CalendarPage'),
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes',
  component: lazyRouteComponent(() => import('@/features/notes/routes'), 'NotesPage'),
});

const portfolioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portfolio',
  component: lazyRouteComponent(() => import('@/features/portfolio/routes'), 'PortfolioPage'),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('@/features/settings/routes'), 'SettingsPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  calendarRoute,
  notesRoute,
  portfolioRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

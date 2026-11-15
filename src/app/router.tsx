import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router';
import { AppLayout } from './layout/AppLayout';

const rootRoute = createRootRoute({ component: AppLayout });

// Each module is its own chunk, loaded when its route is first opened.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/features/home/routes'), 'HomePage'),
});

const collections = () => import('@/features/collections/routes');

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections',
  component: lazyRouteComponent(collections, 'CollectionsPage'),
});

const collectionNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/new',
  component: lazyRouteComponent(collections, 'CollectionNewPage'),
});

const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/$collectionId',
  component: lazyRouteComponent(collections, 'CollectionPage'),
});

const collectionEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/$collectionId/edit',
  component: lazyRouteComponent(collections, 'CollectionEditPage'),
});

const entryNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/$collectionId/entries/new',
  component: lazyRouteComponent(collections, 'EntryNewPage'),
});

const entryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/$collectionId/entries/$entryId',
  component: lazyRouteComponent(collections, 'EntryEditPage'),
});

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

const recorderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recorder',
  component: lazyRouteComponent(() => import('@/features/recorder/routes'), 'RecorderPage'),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('@/features/settings/routes'), 'SettingsPage'),
});

const calendarNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar/new',
  component: lazyRouteComponent(() => import('@/features/calendar/routes'), 'EventNewPage'),
});

const calendarEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar/$eventId',
  component: lazyRouteComponent(() => import('@/features/calendar/routes'), 'EventEditPage'),
});

const notesNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes/new',
  // `?event=<id>` starts the note for that event.
  validateSearch: (search: Record<string, unknown>): { event?: string } =>
    typeof search.event === 'string' ? { event: search.event } : {},
  component: lazyRouteComponent(() => import('@/features/notes/routes'), 'NoteNewPage'),
});

const notesEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes/$noteId',
  component: lazyRouteComponent(() => import('@/features/notes/routes'), 'NoteEditPage'),
});

const portfolioNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portfolio/new',
  component: lazyRouteComponent(() => import('@/features/portfolio/routes'), 'ProjectNewPage'),
});

const portfolioEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/portfolio/$projectId',
  component: lazyRouteComponent(() => import('@/features/portfolio/routes'), 'ProjectEditPage'),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  collectionsRoute,
  collectionNewRoute,
  collectionRoute,
  collectionEditRoute,
  entryNewRoute,
  entryRoute,
  calendarRoute,
  notesRoute,
  portfolioRoute,
  calendarNewRoute,
  calendarEditRoute,
  notesNewRoute,
  notesEditRoute,
  portfolioNewRoute,
  portfolioEditRoute,
  recorderRoute,
  settingsRoute,
]);

// The window scrolls the page, so each new page opens at the top and Back returns to where it was.
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

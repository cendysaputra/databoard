import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { navItems } from './nav';

/** Where Ctrl+N goes, by the module that is open; anywhere else it starts a note. */
const newPages = [
  ['/calendar', '/calendar/new'],
  ['/portfolio', '/portfolio/new'],
  ['/notes', '/notes/new'],
] as const;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** The digit that opens a module with Ctrl, following the sidebar order. */
export const shortcutDigit = (index: number) => String(index + 1);

/**
 * App-wide keyboard shortcuts: Ctrl+1…N opens the module at that place in the sidebar,
 * Ctrl+N starts a new item in the open module. Ctrl+K (the palette) lives with the palette.
 */
export function useShortcuts(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      // While typing, these keys would leave the page and lose what was written.
      if (isTyping(event.target)) return;

      if (event.key.toLowerCase() === 'n') {
        const { pathname } = router.state.location;
        const to = newPages.find(([module]) => pathname.startsWith(module))?.[1] ?? '/notes/new';
        event.preventDefault();
        void router.navigate({ to });
        return;
      }

      const item = navItems.find((_, index) => shortcutDigit(index) === event.key);
      if (item) {
        event.preventDefault();
        void router.navigate({ to: item.to });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, router]);
}

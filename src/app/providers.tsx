import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { useSettings } from '@/shared/hooks/use-settings';
import { applyAppearance } from '@/shared/utils/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is local, so refetching is cheap; refetch on focus picks up MCP changes.
      staleTime: 0,
      refetchOnWindowFocus: true,
      retry: false,
    },
  },
});

/** Keeps <html> in sync with the saved theme and accent color. */
function AppearanceSync() {
  const settings = useSettings().data;
  const theme = settings?.theme;
  const accent = settings?.accent_color;

  useEffect(() => {
    if (theme && accent) applyAppearance({ theme, accent_color: accent });
  }, [theme, accent]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppearanceSync />
      {children}
    </QueryClientProvider>
  );
}

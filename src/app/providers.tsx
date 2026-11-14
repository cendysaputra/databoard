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

/** Keeps <html> in sync with the saved theme and accent colors. */
function AppearanceSync() {
  const settings = useSettings().data;
  const theme = settings?.theme;
  const accent = settings?.accent_color;
  const secondary = settings?.accent_color_secondary;

  useEffect(() => {
    if (theme && accent && secondary) {
      applyAppearance({ theme, accent_color: accent, accent_color_secondary: secondary });
    }
  }, [theme, accent, secondary]);

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

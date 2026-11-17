import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs`. A page left open for hours, like the home
 * page in the desktop app, would otherwise keep showing the moment it was opened.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

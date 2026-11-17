import { useEffect } from 'react';
import { data } from '@/data';

const CHECK_MS = 30_000;
const STORE_KEY = 'databoard.notifiedReminders';

// Id plus time: a moved reminder fires again.
const shownKey = (reminder: { id: string; remind_at: string }) =>
  `${reminder.id}@${reminder.remind_at}`;

/** Shown reminders, per browser. */
function readShown(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeShown(ids: Set<string>): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage blocked: a reminder may be shown again after a reload, nothing worse.
  }
}

/**
 * Shows reminders whose time has come while the app is open in a browser. The desktop app
 * has its own scheduler in Rust; the browser has nothing else that fires them.
 */
export function useBrowserReminders(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || data.kind !== 'browser') return;
    let running = false;
    const check = async () => {
      if (running) return;
      running = true;
      try {
        const open = await data.reminders.list(true);
        const shown = readShown();
        const now = Date.now();
        for (const reminder of open) {
          const key = shownKey(reminder);
          if (shown.has(key) || new Date(reminder.remind_at).getTime() > now) continue;
          shown.add(key);
          await data.notify('DataBoard', reminder.message);
        }
        // Drop done, gone or moved reminders.
        const openKeys = new Set(open.map(shownKey));
        writeShown(new Set([...shown].filter((key) => openKeys.has(key))));
      } catch {
        // Try again on the next round.
      } finally {
        running = false;
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), CHECK_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);
}

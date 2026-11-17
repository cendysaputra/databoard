import { unescapeMarkdown } from '@/shared/utils/markdown-text';

/** An unchecked checklist line that ends in a date, e.g. `- [ ] Kirim notulen @2026-11-20 09:00`. */
export interface ActionItem {
  message: string;
  /** When to remind, as an ISO timestamp. */
  remindAt: string;
}

/** Hour used when the line gives a date without a time. */
const DEFAULT_TIME = '09:00';

const OPEN_TASK = /^\s*[-*] \[ \] \S/m;
const DATED_TASK = /^\s*[-*] \[ \] (.+?)\s+@(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2})[:.](\d{2}))?\s*$/;

/** True when the markdown has at least one unchecked checklist line with text. */
export const hasOpenTasks = (markdown: string) => OPEN_TASK.test(markdown);

/** The unchecked checklist lines of a note that carry a date (read in local time). */
export function parseActionItems(markdown: string): ActionItem[] {
  return markdown.split('\n').flatMap((line) => {
    const match = DATED_TASK.exec(line);
    if (!match) return [];
    const [, message = '', day, hour, minute] = match;
    const time = hour && minute ? `${hour.padStart(2, '0')}:${minute}` : DEFAULT_TIME;
    const when = new Date(`${day}T${time}`);
    return Number.isNaN(when.getTime())
      ? []
      : [{ message: unescapeMarkdown(message), remindAt: when.toISOString() }];
  });
}

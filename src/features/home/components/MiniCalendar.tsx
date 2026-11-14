import { addDays, addMonths, isSameDay, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import { cn } from '@/shared/utils/cn';
import { formatLongDate, formatMonthYear } from '@/shared/utils/date';

const text = t.home.calendar;

interface MiniCalendarProps {
  /** Any day inside the month on display. */
  month: Date;
  /** First cell of the grid (a Monday) and how many weeks it shows. */
  gridStart: Date;
  weeks: number;
  today: Date;
  selected: Date | null;
  /** Whether a day has at least one event. */
  hasEvents(day: Date): boolean;
  onMonthChange(month: Date): void;
  onSelect(day: Date): void;
}

/** A month grid. Today is the solid square; days with events carry a dot. */
export function MiniCalendar({
  month,
  gridStart,
  weeks,
  today,
  selected,
  hasEvents,
  onMonthChange,
  onSelect,
}: MiniCalendarProps) {
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  const arrow =
    'flex size-7 items-center justify-center rounded-sm bg-surface-hover text-muted transition-colors hover:text-text';

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="font-semibold capitalize">{formatMonthYear(month)}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={arrow}
            aria-label={text.previous}
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className={arrow}
            aria-label={text.next}
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {text.weekdays.map((name) => (
          <span key={name} className="pb-2 text-xs text-muted">
            {name}
          </span>
        ))}
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const isSelected = selected !== null && isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-label={formatLongDate(day)}
              aria-pressed={isSelected}
              onClick={() => onSelect(day)}
              className={cn(
                'relative mx-auto flex size-9 items-center justify-center rounded-sm text-sm font-medium tabular-nums transition-colors',
                !isSameMonth(day, month) && 'text-muted opacity-50',
                isToday ? 'bg-accent text-accent-contrast' : 'hover:bg-surface-hover',
                isSelected && !isToday && 'ring-2 ring-accent ring-inset',
              )}
            >
              {day.getDate()}
              {hasEvents(day) && (
                <span
                  className={cn(
                    'absolute bottom-1 size-1 rounded-full',
                    isToday ? 'bg-accent-contrast' : 'bg-art-pink',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

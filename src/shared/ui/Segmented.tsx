import type { ComponentType } from 'react';
import { cn } from '@/shared/utils/cn';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

interface SegmentedProps<T extends string> {
  /** Accessible name of the group. */
  label: string;
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange(value: T): void;
}

/** A compact row of choices where exactly one is active, such as a view switch. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-1 rounded-sm border border-border bg-surface p-1"
    >
      {options.map(({ value: option, label: name, icon: Icon }) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-xs font-medium transition-colors',
              active ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-text',
            )}
          >
            {Icon && <Icon aria-hidden className="size-3.5" />}
            {name}
          </button>
        );
      })}
    </div>
  );
}

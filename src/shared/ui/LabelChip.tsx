import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

/** The look of a small grey pill that only displays a label or a tool. */
export const pillClass = 'rounded-sm bg-surface-hover px-2 py-0.5 text-xs text-muted';

interface LabelChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** A pill for a label. As a button it toggles; give it `disabled` to use it as plain display. */
export function LabelChip({ active, className, type = 'button', ...props }: LabelChipProps) {
  return (
    <button
      type={type}
      aria-pressed={props.disabled ? undefined : Boolean(active)}
      className={cn(
        'rounded-sm px-3 py-1 text-xs font-medium transition-colors',
        active ? 'bg-accent text-accent-contrast' : 'bg-surface-hover text-muted',
        !props.disabled && !active && 'hover:text-text',
        className,
      )}
      {...props}
    />
  );
}

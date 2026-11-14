import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Square button for a single icon; pass `aria-label`. */
  icon?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-contrast hover:opacity-90',
  secondary: 'border border-border bg-bg hover:bg-surface-hover',
  ghost: 'text-muted hover:bg-surface-hover hover:text-text',
};

export function Button({
  variant = 'secondary',
  icon = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-sm text-sm font-medium',
        'transition-[background-color,color,opacity] disabled:opacity-50',
        icon ? 'w-8' : 'px-3',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

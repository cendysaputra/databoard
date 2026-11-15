import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm transition-colors',
        'placeholder:text-muted',
        className,
      )}
      {...props}
    />
  );
}

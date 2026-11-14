import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-8 w-full rounded-sm border border-border bg-bg px-3 text-sm transition-colors',
        'placeholder:text-muted hover:border-muted',
        className,
      )}
      {...props}
    />
  );
}

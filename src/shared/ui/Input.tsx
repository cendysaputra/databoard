import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-sm border border-border bg-transparent px-3 text-sm transition-colors',
        'placeholder:text-muted hover:border-muted',
        className,
      )}
      {...props}
    />
  );
}

import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-sm border border-border bg-surface px-2 text-sm transition-colors hover:border-muted',
        className,
      )}
      {...props}
    />
  );
}

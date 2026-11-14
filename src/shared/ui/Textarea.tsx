import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'block w-full resize-y rounded-sm border border-border bg-surface px-3 py-3 text-sm',
        'transition-colors placeholder:text-muted hover:border-muted',
        className,
      )}
      {...props}
    />
  );
}

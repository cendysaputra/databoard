import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'block w-full resize-y rounded-sm border border-border bg-transparent px-3 py-2 text-sm',
        'transition-colors placeholder:text-muted hover:border-muted',
        className,
      )}
      {...props}
    />
  );
}

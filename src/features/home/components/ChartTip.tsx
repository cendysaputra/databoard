import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Tooltip for one chart mark. Put it inside a `group relative` hit area;
 * it shows while that area is hovered or focused.
 */
export function ChartTip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-sm bg-text px-2 py-1',
        'text-xs whitespace-nowrap text-surface opacity-0 transition-opacity',
        'group-hover:opacity-100 group-focus-visible:opacity-100',
        className,
      )}
    >
      {children}
    </span>
  );
}

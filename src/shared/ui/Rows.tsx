import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

/** A ruled list: rows separated by hairlines, like lines in a ledger. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('border-t border-border', className)}>{children}</ul>;
}

interface RowProps {
  /** Narrow leading column, usually a date. */
  lead?: ReactNode;
  children: ReactNode;
  /** Trailing detail, right-aligned. */
  trail?: ReactNode;
}

export function Row({ lead, children, trail }: RowProps) {
  return (
    <li className="flex items-baseline gap-5 border-b border-border py-3.5 transition-colors hover:bg-surface-hover/50">
      {lead !== undefined && <div className="label w-24 shrink-0">{lead}</div>}
      <div className="min-w-0 flex-1">{children}</div>
      {trail !== undefined && <div className="shrink-0 text-sm text-muted">{trail}</div>}
    </li>
  );
}

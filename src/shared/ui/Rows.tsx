import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

/** A ruled list: rows separated by hairlines, like lines in a ledger. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('data-rows', className)}>{children}</ul>;
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
    <li className="data-row relative flex items-center gap-5 px-5 py-5">
      {lead !== undefined && (
        <div className="row-lead w-24 shrink-0 text-xs text-muted tabular-nums">{lead}</div>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {trail !== undefined && <div className="row-trail shrink-0 text-xs text-muted">{trail}</div>}
    </li>
  );
}

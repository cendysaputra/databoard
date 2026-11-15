import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

/** A list of rows, each drawn as its own card. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('data-rows', className)}>{children}</ul>;
}

/** A checkbox at the start of a row, for picking it in selection mode. */
export interface RowSelect {
  checked: boolean;
  /** Accessible name, e.g. "Pilih Standup mingguan". */
  label: string;
  onChange(): void;
}

interface RowProps {
  /** Narrow leading column, usually a date. */
  lead?: ReactNode;
  children: ReactNode;
  /** Trailing detail, right-aligned. */
  trail?: ReactNode;
  /** Shows a checkbox before the row; leave out when the list is not being selected from. */
  select?: RowSelect;
}

export function Row({ lead, children, trail, select }: RowProps) {
  return (
    <li className="data-row relative flex items-center gap-5 px-5 py-5">
      {select && (
        <input
          type="checkbox"
          aria-label={select.label}
          checked={select.checked}
          onChange={select.onChange}
          // Above the row's full-size link, so a click ticks the box instead of opening the row.
          className="relative z-10 size-4 shrink-0 cursor-pointer accent-(--accent)"
        />
      )}
      {lead !== undefined && (
        <div className="row-lead w-24 shrink-0 text-xs text-muted tabular-nums">{lead}</div>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {trail !== undefined && <div className="row-trail shrink-0 text-xs text-muted">{trail}</div>}
    </li>
  );
}

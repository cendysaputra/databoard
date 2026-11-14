import { t } from '@/shared/i18n/id';

interface StatusBarsProps {
  rows: Array<{ label: string; count: number }>;
}

/** Horizontal bars comparing a few named counts; every row is labelled with its value. */
export function StatusBars({ rows }: StatusBarsProps) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <ul className="flex flex-col gap-4 pt-1">
      {rows.map(({ label, count }) => (
        <li
          key={label}
          title={`${label} · ${t.home.projects.count(count)}`}
          className="grid grid-cols-[4.5rem_1fr_1.5rem] items-center gap-3"
        >
          <span className="text-sm">{label}</span>
          <span className="h-2.5 border-l border-border">
            <span
              style={{ width: `${(count / max) * 100}%` }}
              className="block h-full rounded-r-[4px] bg-accent"
            />
          </span>
          <span className="text-right text-sm font-semibold tabular-nums">{count}</span>
        </li>
      ))}
    </ul>
  );
}

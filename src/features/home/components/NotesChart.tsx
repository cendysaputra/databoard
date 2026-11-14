import { t } from '@/shared/i18n/id';
import { formatDayMonth } from '@/shared/utils/date';
import { ChartTip } from './ChartTip';

interface NotesChartProps {
  /** First day of each week bucket, oldest first. */
  weeks: Date[];
  /** Notes created per week, same order as `weeks`. */
  counts: number[];
}

const TOP_ROOM = 22; // percent of height kept free above the highest point

/** Line chart of new notes per week. Hover a week for its count. */
export function NotesChart({ weeks, counts }: NotesChartProps) {
  const max = Math.max(...counts, 1);
  const last = counts.length - 1;
  // Positions in percent of the plot box; x sits at the center of each week's column.
  const points = counts.map((count, i) => ({
    x: ((i + 0.5) / counts.length) * 100,
    y: 100 - (count / max) * (100 - TOP_ROOM),
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const first = points[0];
  const end = points[last];

  return (
    <div>
      <div className="relative h-36 border-b border-border">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          aria-hidden
        >
          {first && end && (
            <polygon points={`${first.x},100 ${line} ${end.x},100`} fill="var(--accent-soft)" />
          )}
          <polyline
            points={line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <ul className="absolute inset-0 flex" aria-label={t.home.notes.caption}>
          {counts.map((count, i) => {
            const week = weeks[i];
            const point = points[i];
            if (!week || !point) return null;
            const summary = `${t.home.notes.week(formatDayMonth(week))} · ${t.home.notes.count(count)}`;

            return (
              <li
                key={week.toISOString()}
                tabIndex={0}
                aria-label={summary}
                className="group relative flex-1 outline-offset-2"
              >
                {/* Crosshair for the hovered week. */}
                <span className="absolute inset-y-0 left-1/2 w-px bg-text opacity-0 transition-opacity group-hover:opacity-25 group-focus-visible:opacity-25" />
                {/* Marker with a ring in the surface color so it reads on top of the line. */}
                <span
                  style={{ top: `${point.y}%` }}
                  className="absolute left-1/2 size-2.5 -translate-1/2 rounded-full bg-accent ring-2 ring-surface"
                />
                {i === last && (
                  <span
                    style={{ top: `${point.y}%` }}
                    className="absolute left-1/2 -translate-x-1/2 -translate-y-[1.6rem] text-xs font-semibold"
                  >
                    {count}
                  </span>
                )}
                <ChartTip
                  className={i === last ? 'top-0 left-auto right-0 translate-x-0' : 'top-0'}
                >
                  {summary}
                </ChartTip>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex justify-between pt-2 text-xs text-muted">
        <span>{weeks[0] && formatDayMonth(weeks[0])}</span>
        <span>{weeks[last] && formatDayMonth(weeks[last])}</span>
      </div>
    </div>
  );
}

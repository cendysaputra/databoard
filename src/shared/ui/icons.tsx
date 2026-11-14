import type { SVGProps } from 'react';

/**
 * DataBoard's own icon set. Each icon mixes an outline with one solid part,
 * so the set carries the brand instead of looking generic.
 * Small utility icons (search, arrows) still come from lucide-react.
 */

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = (props: IconProps) => React.JSX.Element;

function Svg(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

/** The solid part of an icon; the rest is outline. */
const accent = { fill: 'currentColor', stroke: 'none' } as const;

/** The DataBoard mark: bars of data whose ends trace the letter D. */
export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <rect width="24" height="24" rx="6" fill="var(--text)" />
      <g fill="var(--bg)">
        <rect x="6" y="5.5" width="8" height="2.6" rx="1.3" />
        <rect x="6" y="15.9" width="8" height="2.6" rx="1.3" />
        <rect x="6" y="12.4" width="12" height="2.6" rx="1.3" />
      </g>
      <rect x="6" y="9" width="12" height="2.6" rx="1.3" fill="var(--bg)" opacity="0.45" />
    </svg>
  );
}

/** Home: a rising run of bars, the tallest capped in accent. */
export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h16" />
      <path d="M7 16.5v-4M12 16.5V9M17 16.5V6.5" strokeWidth={2.6} />
      <circle cx="17" cy="4.2" r="1.7" {...accent} />
    </Svg>
  );
}

/** Collections: a stack of sheets, the top one in accent. */
export function CollectionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 13.5l8 4 8-4M4 17l8 4 8-4" />
      <path d="M12 3l8 4-8 4-8-4 8-4Z" {...accent} />
    </Svg>
  );
}

/** Calendar: a tear-off page with today marked. */
export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5L16 21H5a1.5 1.5 0 0 1-1.5-1.5V8A1.5 1.5 0 0 1 5 6.5Z" />
      <path d="M20.5 16.500H17.500a1.5 1.5 0 0 0-1.5 1.500V21" />
      <path d="M8 4v4M16 4v4" />
      <circle cx="9.2" cy="14" r="2.3" {...accent} />
    </Svg>
  );
}

/** Notes: a sheet with handwriting and an accent pen stroke. */
export function NotesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h9a1.5 1.5 0 0 0 1.5-1.500V13" />
      <path d="M8 9.500c1-1.2 1.8 1.2 2.8 0M8 13h4M8 16.500h5.5" />
      <path
        d="M19.6 3.400a1.7 1.7 0 0 1 1.2 2.900l-5.3 5.3-3 .7.7-3 5.3-5.300a1.7 1.7 0 0 1 1.1-.6Z"
        {...accent}
      />
    </Svg>
  );
}

/** Portfolio: two stacked works, the front one in accent. */
export function PortfolioIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7.5" y="3.5" width="13" height="11" rx="1.5" />
      <rect x="3.5" y="9" width="13" height="11.5" rx="1.5" {...accent} />
      <path d="M6.5 17.500l2.5-3 2 2 1.5-1.5 1.5 2.5" stroke="var(--bg)" />
    </Svg>
  );
}

/** Settings: two sliders with accent knobs. */
export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h16M4 16h16" />
      <circle cx="15" cy="8" r="2.6" {...accent} />
      <circle cx="9" cy="16" r="2.6" {...accent} />
    </Svg>
  );
}

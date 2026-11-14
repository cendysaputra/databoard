import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = (props: IconProps) => React.JSX.Element;

/** Light line drawings with open contours and consistent optical weight. */
function Outline({ children, className = '', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`module-icon ${className}`}
      {...props}
    >
      {children}
    </svg>
  );
}

/** The approved D monogram is unchanged. */
export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <rect width="24" height="24" rx="5" fill="var(--text)" />
      <g fill="var(--bg)">
        <rect x="6.5" y="6" width="2.8" height="12" rx="0.8" />
        <path d="M11 6h1a6 6 0 0 1 0 12h-1v-2.8h1a3.2 3.2 0 0 0 0-6.4h-1Z" />
      </g>
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3 11.5 10.6 4a2 2 0 0 1 2.8 0L21 11.5 M5 10.2v8.3A1.5 1.5 0 0 0 6.5 20H10v-5a2 2 0 0 1 4 0v5h3.5a1.5 1.5 0 0 0 1.5-1.5v-5" />
    </Outline>
  );
}

export function CollectionIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M18 9.5V5.7a1.7 1.7 0 0 0-1.7-1.7H5.7A1.7 1.7 0 0 0 4 5.7v10.6A1.7 1.7 0 0 0 5.7 18h3.8 M8 7h4 M11.5 10h7a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5v-5" />
    </Outline>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M8 3v4 M16 3v4 M5 10h15v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V7 M8 14h2 M14 14h2 M8 17h2" />
    </Outline>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M4 20c3-3.3 6.2-8.2 10-12 M8 15c-1.2-3.8 4.1-10 12-12-.5 7.8-4.4 12.4-9.2 12.3 M4 21h15" />
    </Outline>
  );
}

export function PortfolioIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6 M4 11.5c4.8 2.3 11.2 2.3 16 0V8.5A1.5 1.5 0 0 0 18.5 7h-13A1.5 1.5 0 0 0 4 8.5v10A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15 M12 12v3" />
    </Outline>
  );
}

export function RecordIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M15.5 10 21 7v10l-5.5-3 M15.5 17V7a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 7v10a1.5 1.5 0 0 0 1.5 1.5h7.8 M7 9h3" />
    </Outline>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M5 3v5 M5 12v9 M12 3v10 M12 17v4 M19 3v3 M19 10v11 M3 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M10 15a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M17 8a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
    </Outline>
  );
}

import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = (props: IconProps) => React.JSX.Element;

/** Continuous-line drawings: each module is drawn with one open path and visible pen loops. */
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
      <path d="M2.7 13.2C5.2 11.4 8.2 5.4 11.5 4.1c2.4-.9 6.6 6.1 9.8 8.2-1.3.5-2.3-.2-3-1v7.2c0 2-1.5 2-3.8 1.6v-4.3c0-3.5-4.7-3.5-4.7 0v4.3c-2.1.5-3.7.2-3.7-1.7v-6c0-1.6 1.9-1.7 1.9-.3s-2.2 2.7-3.9 1.9" />
    </Outline>
  );
}

export function CollectionIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3 15.1c3.4.8 6 4.7 8.8 5.1 2.4.3 5.9-3.6 9.1-4.7-2.5-1.4-5.5-2.5-7.8-2.7-1.7-.2-2.2 1.2-1.2 1.8 1.4.8 2.5-1.5.5-2.4L3.2 8.4c2.8-1.8 6-4.3 8.6-4.6 2.8.3 6.2 2.4 9 4.2l-8.7 5.1-7-2.8c.1 3.8 2.1 5.1 6 6.9 1.8.8 4.3-1.2 7.7-3.2" />
    </Outline>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M2.4 10.2c4.8 1.7 12.3 1.2 17.6-.4l-.7 8c-.2 2-1.4 2.8-3.4 2.8H7.5c-2.3 0-3.3-1-3.3-3.3V7.7c0-2 1.2-2.8 3.3-2.8h1c2 0 2-2.2.5-2.2s-1.3 3.8.3 4.1L15 6c2.2-.3 2.3-3.4.8-3.4s-1 2.9.7 2.9h1.4c1.8 0 2.2 1.1 2 2.9" />
    </Outline>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3 21C8 17.9 11.1 7.5 21 3c-.3 6.8-4.6 10.1-9.7 11.3-1.9.4-3.8-.3-3.1-1.5.8-1.2 2.2-.2 1.5 1.3" />
    </Outline>
  );
}

export function PortfolioIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M2.9 10.7c4.8 2.2 13.8 2.1 18.1-.2l-1.2 8c-.3 1.9-1.5 2.4-3.4 2.4H7.5c-2.1 0-3.2-.8-3.4-2.8L3.6 8.3c-.1-1.2.9-2.1 2.4-2.1h12.6c1.5 0 2.2 1 1.9 2.5l-.3 2.1c-1.9-.1-4.2-.7-4.6-1.9l-1.2-4.3c-.4-1.4-2.2-1.5-3.9-1.1-1.9.4-2.7 1.6-2 2.7.6 1.1 2.4.3 1.8-.9" />
    </Outline>
  );
}

export function RecordIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M2.8 8.5c2-2.7 8.1-1.9 10.5-1.8 2.5.1 2.6 1.7 2.5 3.8l5.4-3.1v10l-5.4-3.3v2.3c0 2.1-1.7 2.6-3.9 2.5l-6.1-.3c-2.1-.1-3-1.3-3-3.3v-6c0-2.8 4.3-2.9 7.1-.3 3 2.7 1 6.4-1.9 5.8-3.1-.6-2.2-3.9 0-3.4" />
    </Outline>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M13.8 4.4c1.5-1.3 4 .4 3.7 2.3L20 8c1.4.9.9 3.2-.6 4l-.1 2.5c0 1.9-1.8 3.2-3.5 2.8l-1.4 2.4c-1 1.5-3.3 1.2-4.1-.4l-2.4-.4c-1.8 0-3.1-1.5-2.8-3.2l-2.2-1.6c-1.1-1.3-.1-3.3 1.4-3.9l.6-2.5c.2-1.8 2.3-2.9 3.9-2.1l1.4-2.2c1-1.4 3.1-.9 3.6 1 1 1.8-1.5 2.7-2.6 3.9-2 2-2.4 5.5 0 6.4 2.7 1 4.7-2.6 3-4.2-1.4-1.4-3.7.5-2.4 1.7" />
    </Outline>
  );
}

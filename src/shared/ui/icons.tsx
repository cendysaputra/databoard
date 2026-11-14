import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = (props: IconProps) => React.JSX.Element;

/** Shared pen-line construction: open contours, rounded ends, restrained curves. */
function Outline({ children, className = '', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.55}
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
      <path d="M3.4 11.6c2.3-2.2 5-5.7 7.7-7.5.7-.5 1.3-.5 2 0 2.4 1.6 5.1 5.2 7.5 7.5M5.5 10.3v7.6c0 1.7.8 2.6 2.5 2.6h2v-5.8c0-1 .7-1.7 1.7-1.7h.6c1 0 1.7.7 1.7 1.7v5.8h2c1.7 0 2.5-.9 2.5-2.6v-5.4" />
    </Outline>
  );
}

export function CollectionIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3.4 8.9 11 4.4c.7-.4 1.3-.4 2 0l7.6 4.5-7.5 4.3c-.7.4-1.4.4-2.1 0L4.8 9.6M3.8 13.1l7.2 4.1c.7.4 1.4.4 2.1 0l7.1-4M4.6 17.6l6.4 3.2c.7.4 1.4.4 2.1 0l6.3-3.2" />
    </Outline>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M7.5 3.4v4.3c0 .8-.3 1.2-.8 1.2s-.8-.4-.8-.9c0-.9 1-1.4 2.3-1.4H17c2 0 3 1 3 3v7.9c0 2-1 3-3 3H7c-2 0-3-1-3-3V9.4c0-1.9.9-2.8 2.8-2.8M16.4 3.4v4.4M4.3 11.5h12.9" />
    </Outline>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M13.8 3.5H8c-2 0-3 1-3 3v11c0 2 1 3 3 3h8c2 0 3-1 3-3V8.9l-4.7-5.1v3.7c0 1.2.6 1.8 1.7 1.8h2.6M8.7 13h6.6M8.7 16.5h4.7" />
    </Outline>
  );
}

export function PortfolioIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3.6 8.2c0-1.6.9-2.6 2.6-2.6h2.6c1.6 0 2 2.6 3.6 2.6h5.4c1.7 0 2.6.9 2.6 2.6v6.7c0 1.7-.9 2.6-2.6 2.6H6.2c-1.7 0-2.6-.9-2.6-2.6V8.2c0 2.2 1.2 3.3 3.3 3.3h10.6" />
    </Outline>
  );
}

export function RecordIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M6.4 6.5h6.1c1.9 0 2.9 1 2.9 2.9v5.2c0 1.9-1 2.9-2.9 2.9H5.9c-1.9 0-2.9-1-2.9-2.9V9.4c0-1.9 1.1-3 3-2.9M15.5 10c1.5-1.2 3.2-2.5 5.2-3.1v10.2c-2-.7-3.7-1.9-5.2-3.1" />
    </Outline>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M4 7.3h7.3c1.2 0 2-.7 2-1.8S12.5 3.7 11.4 3.7s-1.9.8-1.9 1.9.8 1.9 2 1.9H20M20 16.7h-7.3c-1.2 0-2 .7-2 1.8s.8 1.8 1.9 1.8 1.9-.8 1.9-1.9-.8-1.9-2-1.9H4" />
    </Outline>
  );
}

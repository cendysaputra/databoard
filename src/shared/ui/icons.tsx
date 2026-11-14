import { Calendar, FileText, Folder, House, Layers2, SlidersHorizontal } from 'lucide-react';
import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = (props: IconProps) => React.JSX.Element;

/** A split D monogram: one stem and one open bowl, without decorative accents. */
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

/** One outline family and stroke weight for module navigation and empty states. */
export function HomeIcon(props: IconProps) {
  return <House aria-hidden strokeWidth={1.5} {...props} />;
}

export function CollectionIcon(props: IconProps) {
  return <Layers2 aria-hidden strokeWidth={1.5} {...props} />;
}

export function CalendarIcon(props: IconProps) {
  return <Calendar aria-hidden strokeWidth={1.5} {...props} />;
}

export function NotesIcon(props: IconProps) {
  return <FileText aria-hidden strokeWidth={1.5} {...props} />;
}

export function PortfolioIcon(props: IconProps) {
  return <Folder aria-hidden strokeWidth={1.5} {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <SlidersHorizontal aria-hidden strokeWidth={1.5} {...props} />;
}

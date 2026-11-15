import { Link, type LinkProps } from '@tanstack/react-router';
import { CalendarIcon, NotesIcon, PortfolioIcon } from '@/shared/ui/icons';

const icons = [CalendarIcon, NotesIcon, PortfolioIcon];

interface CategoryCardProps {
  art: number;
  name: string;
  stat: number;
  caption: string;
  link: Pick<LinkProps, 'to' | 'params'>;
}

/** Neutral module summaries; labels and counts remain live HTML. */
export function CategoryCard({ art, name, stat, caption, link }: CategoryCardProps) {
  const Icon = icons[art] ?? CalendarIcon;
  return (
    <Link {...link} className="category-card">
      <span className="flex items-center gap-3">
        <span className="category-icon">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="category-name">{name}</span>
      </span>
      <span className="category-count flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-3xl leading-none font-semibold tabular-nums">{stat}</span>
        <span className="text-xs text-muted">{caption}</span>
      </span>
    </Link>
  );
}

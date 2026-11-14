import { Link, type LinkProps } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';

interface CategoryCardProps {
  art: number;
  name: string;
  stat: number;
  caption: string;
  link: Pick<LinkProps, 'to' | 'params'>;
}

/** The illustration is decorative; all names and counts remain live HTML. */
export function CategoryCard({ art, name, stat, caption, link }: CategoryCardProps) {
  return (
    <Link {...link} className={`category-card category-card-${art % 3}`}>
      <span aria-hidden className="category-art" />
      <span className="category-name">{name}</span>
      <ArrowUpRight aria-hidden className="category-arrow" />
      <span className="category-count">
        <span className="block text-3xl leading-none font-semibold tabular-nums">{stat}</span>
        <span className="mt-1.5 block text-xs">{caption}</span>
      </span>
    </Link>
  );
}

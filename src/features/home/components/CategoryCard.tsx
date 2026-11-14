import { Link, type LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

const yellow = 'var(--art-yellow)';
const orange = 'var(--art-orange)';
const pink = 'var(--art-pink)';
const purple = 'var(--art-purple)';
const sky = 'var(--art-sky)';
const navy = 'var(--art-navy)';

/** The looks a card can take: a base color, whether its text is light, and its shapes. */
const arts: Array<{ base: string; lightText: boolean; shapes: ReactNode }> = [
  {
    base: yellow,
    lightText: false,
    shapes: (
      <>
        <circle cx="48" cy="26" r="20" fill={pink} />
        <circle cx="92" cy="26" r="20" fill={orange} />
        <circle cx="48" cy="70" r="20" fill={orange} />
        <circle cx="92" cy="70" r="20" fill={orange} opacity=".55" />
        <path d="M0 96a54 54 0 0 1 54 54H0Z" fill={orange} opacity=".35" />
      </>
    ),
  },
  {
    base: purple,
    lightText: true,
    shapes: (
      <>
        <path d="M34 0h52v14a26 26 0 0 1-52 0Z" fill={yellow} />
        <path d="M60 30l24 24-24 24-24-24Z" fill={sky} />
        <path d="M84 60h36v36H102a18 18 0 0 1-18-18Z" fill={orange} />
        <circle cx="12" cy="92" r="20" fill={pink} />
        <path d="M0 20a26 26 0 0 1 0 52Z" fill={navy} opacity=".5" />
      </>
    ),
  },
  {
    base: sky,
    lightText: false,
    shapes: (
      <>
        <rect x="52" y="-10" width="34" height="60" rx="17" fill={orange} />
        <circle cx="30" cy="56" r="22" fill={pink} />
        <circle cx="82" cy="78" r="18" fill={yellow} />
        <path d="M120 20v52a26 26 0 0 1 0-52Z" fill={purple} />
        <path d="M120 110v40H80a40 40 0 0 1 40-40Z" fill={navy} />
        <path d="M0 0h36a36 36 0 0 1-36 36Z" fill={purple} opacity=".6" />
      </>
    ),
  },
  {
    base: navy,
    lightText: true,
    shapes: (
      <>
        <circle cx="34" cy="34" r="24" fill={yellow} />
        <path d="M70 10h40v40a40 40 0 0 1-40-40Z" fill={pink} />
        <path d="M82 62l22 22-22 22-22-22Z" fill={sky} />
        <path d="M0 70a30 30 0 0 1 30 30H0Z" fill={orange} />
      </>
    ),
  },
  {
    base: orange,
    lightText: false,
    shapes: (
      <>
        <path d="M20 0h60v20a30 30 0 0 1-60 0Z" fill={navy} />
        <circle cx="94" cy="56" r="22" fill={yellow} />
        <circle cx="36" cy="72" r="18" fill={pink} />
        <path d="M120 96v54H66a54 54 0 0 1 54-54Z" fill={purple} opacity=".55" />
      </>
    ),
  },
];

interface CategoryCardProps {
  /** Which look to use; any number works, looks repeat. */
  art: number;
  name: string;
  detail: string;
  link: Pick<LinkProps, 'to' | 'params'>;
}

/** A colorful card that opens a module or a collection. */
export function CategoryCard({ art, name, detail, link }: CategoryCardProps) {
  const look = arts[art % arts.length] ?? arts[0];
  if (!look) return null;

  return (
    <Link
      {...link}
      style={{ color: look.lightText ? '#ffffff' : 'var(--art-navy)' }}
      className={cn(
        'relative block h-44 w-36 shrink-0 overflow-hidden rounded-md outline-offset-4',
        'transition-[translate,box-shadow] hover:-translate-y-1.5 hover:shadow-[0_18px_30px_-14px_rgb(23_21_43/0.45)]',
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 120 150"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <rect width="120" height="150" fill={look.base} />
        {look.shapes}
      </svg>
      <span className="absolute inset-x-4 bottom-3.5">
        <span className="block truncate font-semibold">{name}</span>
        <span className="block truncate text-xs opacity-75">{detail}</span>
      </span>
    </Link>
  );
}

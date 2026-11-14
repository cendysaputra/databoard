import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  art?: number;
}

/** The same title and actions, with an optional decorative module illustration. */
export function PageHeader({ title, subtitle, actions, art }: PageHeaderProps) {
  return (
    <header className={cn('page-header', art !== undefined && 'page-header-illustrated')}>
      {art !== undefined && (
        <span aria-hidden className={`page-header-art category-card-${art % 3}`} />
      )}
      <div className="relative min-w-0">
        <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 max-w-md text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions relative flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

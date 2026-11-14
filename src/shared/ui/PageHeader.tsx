import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Page masthead: a large serif title over an ink rule. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4 border-b border-text pb-5">
      <div>
        <h1 className="font-display text-2xl leading-none">{title}</h1>
        {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

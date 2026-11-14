import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="relative min-w-0">
        <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 max-w-md text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions relative flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

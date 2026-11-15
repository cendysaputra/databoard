import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h1 className="min-w-0 text-2xl leading-tight font-semibold">{title}</h1>
      {actions && <div className="page-actions relative flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

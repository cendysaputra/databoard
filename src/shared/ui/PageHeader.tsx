import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Page heading with an optional subtitle and actions. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl leading-none font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

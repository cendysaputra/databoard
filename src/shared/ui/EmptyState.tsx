import type { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="empty-state flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-6 py-16 text-center">
      <span className="mb-3 flex size-18 items-center justify-center rounded-md bg-accent-soft">
        <Icon className="size-8 text-accent-text" />
      </span>
      <p className="text-xl font-semibold">{title}</p>
      {body && <p className="max-w-sm text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

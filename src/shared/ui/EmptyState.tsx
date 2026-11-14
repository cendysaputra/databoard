import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Icon aria-hidden className="mb-2 size-8 text-muted" strokeWidth={1.5} />
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

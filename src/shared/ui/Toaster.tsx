import { CircleCheck } from 'lucide-react';
import { useToasts } from './toast';

/** Renders active toasts in the top-right corner. */
export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  return (
    <div aria-live="polite" className="fixed top-6 right-6 z-50 flex w-72 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade rounded-sm border border-border bg-surface px-4 py-3 shadow-lg"
        >
          <p className="flex items-center gap-2 font-medium">
            <CircleCheck aria-hidden className="size-4 shrink-0" />
            {toast.title}
          </p>
          {toast.body && <p className="text-sm text-muted">{toast.body}</p>}
        </div>
      ))}
    </div>
  );
}

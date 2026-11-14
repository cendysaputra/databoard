import { useToasts } from './toast';

/** Renders active toasts in the bottom-right corner. */
export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  return (
    <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-fade rounded-md border border-border bg-surface px-4 py-3 shadow-lg"
        >
          <p className="font-medium">{toast.title}</p>
          {toast.body && <p className="text-sm text-muted">{toast.body}</p>}
        </div>
      ))}
    </div>
  );
}

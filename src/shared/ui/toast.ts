import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  body?: string;
}

interface ToastState {
  toasts: Toast[];
  dismiss(id: number): void;
}

const TOAST_MS = 4000;
let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Shows a short in-app message that disappears on its own. */
export function showToast(title: string, body?: string): void {
  const id = nextId++;
  useToasts.setState((state) => ({ toasts: [...state.toasts, { id, title, body }] }));
  window.setTimeout(() => useToasts.getState().dismiss(id), TOAST_MS);
}

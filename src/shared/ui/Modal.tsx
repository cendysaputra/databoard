import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface ModalProps {
  open: boolean;
  onClose(): void;
  /** Accessible name of the dialog. */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Modal built on the native <dialog>: focus trapping, Escape and the backdrop come for free.
 * Children are mounted only while open, so their state resets on every opening.
 */
export function Modal({ open, onClose, label, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'mx-auto mt-[14vh] w-full max-w-lg rounded-lg border border-border bg-surface p-0 text-text shadow-2xl',
        'backdrop:bg-overlay open:animate-fade',
        className,
      )}
    >
      {open && children}
    </dialog>
  );
}

import { useId, type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  /** Receives the id to put on the input so the label points at it. */
  children(id: string): ReactNode;
}

/** A labelled form control, stacked: label above, input below. */
export function FormField({ label, required, hint, children }: FormFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label mb-2 block">
        {label}
        {required && <span className="text-accent-text"> *</span>}
      </label>
      {children(id)}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

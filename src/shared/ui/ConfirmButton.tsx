import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import { Button } from './Button';

interface ConfirmButtonProps {
  label: string;
  onConfirm(): void;
  disabled?: boolean;
}

/** A destructive action that needs a second click: the first one only asks. */
export function ConfirmButton({ label, onConfirm, disabled }: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);

  return (
    <Button
      variant="ghost"
      disabled={disabled}
      className="text-danger hover:text-danger"
      onClick={() => (asking ? onConfirm() : setAsking(true))}
      onBlur={() => setAsking(false)}
    >
      {asking ? t.common.confirmDelete : label}
    </Button>
  );
}

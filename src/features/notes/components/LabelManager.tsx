import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import type { Tag } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { FormError } from '@/shared/ui/FormError';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useRemoveLabel, useSaveLabel } from '../api';

const text = t.notes.labels;

interface LabelManagerProps {
  open: boolean;
  onClose(): void;
  labels: Tag[];
}

/** Dialog to add, rename and delete labels. */
export function LabelManager({ open, onClose, labels }: LabelManagerProps) {
  const save = useSaveLabel();
  const remove = useRemoveLabel();
  const [name, setName] = useState('');

  const add = () => {
    if (!name.trim()) return;
    save.mutate({ input: { name, color: null } }, { onSuccess: () => setName('') });
  };

  return (
    <Modal open={open} onClose={onClose} label={text.manage} className="max-w-md">
      <div className="flex flex-col gap-5 p-6">
        <h2 className="text-xl font-semibold">{text.manage}</h2>

        {labels.length === 0 && <p className="text-sm text-muted">{text.none}</p>}
        <ul className="flex flex-col gap-2">
          {labels.map((label) => (
            <li key={label.id} className="flex items-center gap-2">
              <Input
                aria-label={text.name}
                key={label.name}
                defaultValue={label.name}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next && next !== label.name) {
                    save.mutate({ id: label.id, input: { name: next, color: label.color } });
                  } else {
                    event.target.value = label.name;
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    // This dialog can sit inside the note form; Enter must not submit that.
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
              <ConfirmButton
                label={t.common.delete}
                disabled={remove.isPending}
                onConfirm={() => remove.mutate(label.id)}
              />
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <Input
            aria-label={text.newPlaceholder}
            placeholder={text.newPlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                add();
              }
            }}
          />
          <Button variant="primary" disabled={save.isPending || !name.trim()} onClick={add}>
            {text.add}
          </Button>
        </div>

        <FormError error={save.error ?? remove.error} />

        <div className="flex justify-end">
          <Button onClick={onClose}>{text.close}</Button>
        </div>
      </div>
    </Modal>
  );
}

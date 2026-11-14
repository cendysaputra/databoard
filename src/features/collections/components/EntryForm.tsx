import { useState, type FormEvent, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Collection, Entry, EntryInput, EntryStatus } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Select } from '@/shared/ui/Select';
import { FieldInput, type FieldValue } from './FieldInput';

const text = t.collections.entries;
const statuses = Object.keys(text.statuses) as EntryStatus[];

interface EntryFormProps {
  collection: Collection;
  /** The entry being edited; leave out to create a new one. */
  entry?: Entry;
  saving: boolean;
  error: unknown;
  onSubmit(input: EntryInput): void;
  onCancel(): void;
  /** Extra actions next to Save, e.g. delete. */
  extra?: ReactNode;
}

/** An entry editor generated from the collection's blueprint. */
export function EntryForm({
  collection,
  entry,
  saving,
  error,
  onSubmit,
  onCancel,
  extra,
}: EntryFormProps) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [status, setStatus] = useState<EntryStatus>(entry?.status ?? 'draft');
  const [values, setValues] = useState<EntryInput['data']>(entry?.data ?? {});

  const setValue = (key: string, value: FieldValue) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ title, status, data: values });
  };

  return (
    <form onSubmit={submit} className="editor-panel flex flex-col gap-7">
      <input
        aria-label={text.title}
        placeholder={text.title}
        required
        autoFocus={!entry}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="w-full border-b border-border bg-transparent pb-4 text-2xl leading-none font-semibold outline-none placeholder:text-muted"
      />

      <FormField label={text.status}>
        {(id) => (
          <Select
            id={id}
            style={{ maxWidth: '16rem' }}
            value={status}
            onChange={(event) => setStatus(event.target.value as EntryStatus)}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {text.statuses[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {collection.fields.map((field) => (
        <FormField key={field.key} label={field.label} required={field.required}>
          {(id) => (
            <FieldInput
              id={id}
              field={field}
              value={values[field.key]}
              onChange={(value) => setValue(field.key, value)}
            />
          )}
        </FormField>
      ))}

      <FormError error={error} />

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {t.common.save}
        </Button>
        <Button onClick={onCancel}>{t.common.cancel}</Button>
        <div className="flex-1" />
        {extra}
      </div>
    </form>
  );
}

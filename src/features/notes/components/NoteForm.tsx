import { useState, type FormEvent, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Note, NoteInput } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';

const text = t.notes.form;

interface NoteFormProps {
  /** The note being edited; leave out to create a new one. */
  note?: Note;
  saving: boolean;
  error: unknown;
  onSubmit(input: NoteInput): void;
  onCancel(): void;
  extra?: ReactNode;
}

export function NoteForm({ note, saving, error, onSubmit, onCancel, extra }: NoteFormProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body_md ?? '');
  const [pinned, setPinned] = useState(note?.pinned ?? false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      title,
      body_md: body,
      pinned,
      // Links to an event or project are kept as they are; linking comes later.
      event_id: note?.event_id ?? null,
      project_id: note?.project_id ?? null,
      note_date: note?.note_date ?? new Date().toISOString().slice(0, 10),
      status: note?.status ?? 'draft',
      label_ids: note?.label_ids ?? [],
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-7">
      <FormField label={text.title} required>
        {(id) => (
          <Input
            id={id}
            required
            autoFocus={!note}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </FormField>

      <FormField label={text.body}>
        {(id) => (
          <Textarea
            id={id}
            rows={16}
            className="font-mono"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        )}
      </FormField>

      <label className="flex w-fit items-center gap-2">
        <input
          type="checkbox"
          className="size-4 accent-(--accent)"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
        />
        {text.pin}
      </label>

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

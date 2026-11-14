import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { t } from '@/shared/i18n/id';
import type { Collection, CollectionInput, FieldDef, FieldType } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { slugify } from '@/shared/utils/slug';

const fieldTypes = Object.keys(t.collections.fieldTypes) as FieldType[];
const text = t.collections.blueprint;

/** A field while it is being edited. */
interface FieldDraft {
  uid: number;
  label: string;
  key: string;
  /** Once the key is typed by hand (or already saved), the label no longer drives it. */
  keyLocked: boolean;
  field_type: FieldType;
  required: boolean;
  optionsText: string;
}

let nextUid = 1;

const toDraft = (field: FieldDef): FieldDraft => ({
  uid: nextUid++,
  label: field.label,
  key: field.key,
  keyLocked: true,
  field_type: field.field_type,
  required: field.required,
  optionsText: field.options.join(', '),
});

const emptyDraft = (): FieldDraft => ({
  uid: nextUid++,
  label: '',
  key: '',
  keyLocked: false,
  field_type: 'text',
  required: false,
  optionsText: '',
});

const toField = (draft: FieldDraft): FieldDef => ({
  key: draft.key,
  label: draft.label,
  field_type: draft.field_type,
  required: draft.required,
  options:
    draft.field_type === 'select'
      ? draft.optionsText
          .split(',')
          .map((option) => option.trim())
          .filter(Boolean)
      : [],
});

interface BlueprintFormProps {
  /** The collection being edited; leave out to create a new one. */
  collection?: Collection;
  saving: boolean;
  error: unknown;
  onSubmit(input: CollectionInput): void;
  onCancel(): void;
}

/** Name, slug and the list of fields of a collection. */
export function BlueprintForm({
  collection,
  saving,
  error,
  onSubmit,
  onCancel,
}: BlueprintFormProps) {
  const [name, setName] = useState(collection?.name ?? '');
  const [slug, setSlug] = useState(collection?.slug ?? '');
  const [slugLocked, setSlugLocked] = useState(Boolean(collection));
  const [description, setDescription] = useState(collection?.description ?? '');
  const [fields, setFields] = useState(() => (collection?.fields ?? []).map(toDraft));

  const change = (uid: number, changes: Partial<FieldDraft>) =>
    setFields((list) => list.map((f) => (f.uid === uid ? { ...f, ...changes } : f)));

  const move = (index: number, by: -1 | 1) =>
    setFields((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      if (item) next.splice(index + by, 0, item);
      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ name, slug, description, fields: fields.map(toField) });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-6">
        <FormField label={text.name} required>
          {(id) => (
            <Input
              id={id}
              required
              autoFocus={!collection}
              value={name}
              placeholder={text.namePlaceholder}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugLocked) setSlug(slugify(event.target.value));
              }}
            />
          )}
        </FormField>
        <FormField label={text.slug}>
          {(id) => (
            <Input
              id={id}
              value={slug}
              className="font-mono"
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugLocked(true);
              }}
            />
          )}
        </FormField>
        <div className="col-span-2">
          <FormField label={text.description}>
            {(id) => (
              <Input
                id={id}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            )}
          </FormField>
        </div>
      </div>

      <section>
        <div className="mb-1 flex items-baseline justify-between border-b border-border pb-3">
          <h2 className="text-xl leading-none font-semibold">{text.fields}</h2>
          <p className="text-sm text-muted">{text.fieldsHint}</p>
        </div>

        {fields.length === 0 && <p className="py-6 text-muted">{text.noFields}</p>}

        <ol>
          {fields.map((field, index) => (
            <li key={field.uid} className="border-b border-border py-4">
              <div className="grid grid-cols-[1.5rem_1fr_10rem_9rem_auto_auto] items-center gap-3">
                <span className="label">{index + 1}</span>
                <Input
                  aria-label={text.label}
                  placeholder={text.label}
                  required
                  value={field.label}
                  onChange={(event) =>
                    change(field.uid, {
                      label: event.target.value,
                      ...(field.keyLocked ? {} : { key: slugify(event.target.value, '_') }),
                    })
                  }
                />
                <Input
                  aria-label={text.key}
                  placeholder={text.key}
                  required
                  pattern="[a-z][a-z0-9_]*"
                  className="font-mono"
                  value={field.key}
                  onChange={(event) =>
                    change(field.uid, { key: event.target.value, keyLocked: true })
                  }
                />
                <Select
                  aria-label={text.type}
                  value={field.field_type}
                  onChange={(event) =>
                    change(field.uid, { field_type: event.target.value as FieldType })
                  }
                >
                  {fieldTypes.map((type) => (
                    <option key={type} value={type}>
                      {t.collections.fieldTypes[type]}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-(--accent)"
                    checked={field.required}
                    onChange={(event) => change(field.uid, { required: event.target.checked })}
                  />
                  {text.required}
                </label>
                <div className="flex">
                  <Button
                    variant="ghost"
                    icon
                    aria-label={text.moveUp}
                    title={text.moveUp}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    icon
                    aria-label={text.moveDown}
                    title={text.moveDown}
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    icon
                    aria-label={text.removeField}
                    title={text.removeField}
                    onClick={() => setFields((list) => list.filter((f) => f.uid !== field.uid))}
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>

              {field.field_type === 'select' && (
                <div className="mt-3 pl-9">
                  <Input
                    aria-label={text.options}
                    placeholder={text.options}
                    required
                    value={field.optionsText}
                    onChange={(event) => change(field.uid, { optionsText: event.target.value })}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>

        <Button className="mt-4" onClick={() => setFields((list) => [...list, emptyDraft()])}>
          <Plus aria-hidden className="size-4" />
          {text.addField}
        </Button>
      </section>

      <FormError error={error} />

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {t.common.save}
        </Button>
        <Button onClick={onCancel}>{t.common.cancel}</Button>
      </div>
    </form>
  );
}

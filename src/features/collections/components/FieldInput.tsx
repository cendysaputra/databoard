import { t } from '@/shared/i18n/id';
import type { EntryInput, FieldDef } from '@/shared/types';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';

/** Short inputs (numbers, dates, choices) do not need the full form width. */
const narrow = { maxWidth: '16rem' };

export type FieldValue = EntryInput['data'][string];

interface FieldInputProps {
  id: string;
  field: FieldDef;
  value: FieldValue | undefined;
  onChange(value: FieldValue): void;
}

/** The right input for one blueprint field. */
export function FieldInput({ id, field, value, onChange }: FieldInputProps) {
  const textValue = typeof value === 'string' ? value : '';
  const common = { id, required: field.required };

  switch (field.field_type) {
    case 'textarea':
      return (
        <Textarea
          {...common}
          rows={3}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'markdown':
      return (
        <Textarea
          {...common}
          rows={12}
          className="font-mono"
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'number':
      return (
        <Input
          {...common}
          type="number"
          step="any"
          style={narrow}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : event.target.valueAsNumber)
          }
        />
      );
    case 'date':
      return (
        <Input
          {...common}
          type="date"
          style={narrow}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'toggle':
      return (
        <label className="flex h-8 w-fit items-center gap-2">
          <input
            id={id}
            type="checkbox"
            className="size-4 accent-(--accent)"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          {t.collections.entries.yes}
        </label>
      );
    case 'select':
      return (
        <Select
          {...common}
          style={narrow}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{t.collections.entries.choose}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    case 'url':
      return (
        <Input
          {...common}
          type="url"
          placeholder="https://"
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return (
        <Input {...common} value={textValue} onChange={(event) => onChange(event.target.value)} />
      );
  }
}

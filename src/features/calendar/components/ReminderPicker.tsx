import { useState } from 'react';
import { t } from '@/shared/i18n/id';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';

const text = t.calendar.form;

const CUSTOM = 'custom';
const HOUR = 60;
const DAY = 1440;
/** One week, the longest lead time offered. */
export const MAX_REMINDER_MINUTES = 10_080;

/** "10 menit sebelumnya", "1 jam sebelumnya", "1 hari sebelumnya". */
export const reminderLabel = (minutes: number) =>
  text.reminderBefore(
    minutes === HOUR ? text.hour : minutes === DAY ? text.day : text.minutes(minutes),
  );

interface ReminderPickerProps {
  id?: string;
  /** The lead time from Settings; always among the choices. */
  defaultMinutes: number;
  /** Minutes before the start, or `null` for no reminder. */
  value: number | null;
  onChange(minutes: number | null): void;
  /** Offers "no reminder" as a choice. */
  allowNone?: boolean;
}

/** Chooses how long before an event to remind: a few usual lead times, or any number of minutes. */
export function ReminderPicker({
  id,
  defaultMinutes,
  value,
  onChange,
  allowNone = false,
}: ReminderPickerProps) {
  const choices = [...new Set([defaultMinutes, 10, HOUR, DAY])]
    .filter((minutes) => minutes > 0)
    .sort((a, b) => a - b);
  const [customChosen, setCustomChosen] = useState(false);
  const custom = customChosen || (value !== null && !choices.includes(value));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Each control fills its box, so the box sets the width. */}
      <div className="w-full sm:w-56">
        <Select
          id={id}
          aria-label={text.reminder}
          value={custom ? CUSTOM : (value ?? '')}
          onChange={(event) => {
            const choice = event.target.value;
            setCustomChosen(choice === CUSTOM);
            if (choice === '') onChange(null);
            else if (choice !== CUSTOM) onChange(Number(choice));
            else if (value === null) onChange(choices[0] ?? 10);
          }}
        >
          {allowNone && <option value="">{text.reminderNone}</option>}
          {choices.map((minutes) => (
            <option key={minutes} value={minutes}>
              {reminderLabel(minutes)}
            </option>
          ))}
          <option value={CUSTOM}>{text.reminderCustom}</option>
        </Select>
      </div>
      {custom && (
        <div className="w-28">
          <Input
            type="number"
            required
            min={1}
            max={MAX_REMINDER_MINUTES}
            aria-label={text.reminderMinutes}
            title={text.reminderMinutes}
            value={value ?? ''}
            onChange={(event) => {
              const minutes = Math.round(event.target.valueAsNumber);
              onChange(minutes >= 1 && minutes <= MAX_REMINDER_MINUTES ? minutes : null);
            }}
          />
        </div>
      )}
    </div>
  );
}

import { Select } from './Select';

interface FilterSelectProps {
  /** Accessible name of the filter. */
  label: string;
  /** Text of the choice that filters nothing. */
  all: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange(value: string): void;
}

/** One dropdown of a filter row; its empty value means "no filter". */
export function FilterSelect({ label, all, value, options, onChange }: FilterSelectProps) {
  return (
    // The select fills its box, so the box sets the width.
    <div className="filter-select w-44">
      <Select
        aria-label={label}
        className="h-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

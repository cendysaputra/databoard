/** Conversions between stored ISO timestamps and the values of date/time inputs (local time). */

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO timestamp → "YYYY-MM-DD" in local time, for `<input type="date">`. */
export function toDateInput(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in local time, for `<input type="datetime-local">`. */
export function toDateTimeInput(iso: string | Date): string {
  const d = new Date(iso);
  return `${toDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Value of a date or datetime-local input → ISO timestamp. A bare date means local midnight. */
export function fromInput(value: string): string {
  return new Date(value.length === 10 ? `${value}T00:00` : value).toISOString();
}

import { describe, expect, it } from 'vitest';
import { toDateInput, toDateTimeInput } from './datetime-input';

describe('toDateInput', () => {
  it('uses the local day, not the UTC one', () => {
    // 17 Nov 01:00 WIB is still 16 Nov in UTC.
    expect(toDateInput('2026-11-16T18:00:00.000Z')).toBe('2026-11-17');
  });

  it('pads a short year to four digits', () => {
    const d = new Date(2026, 0, 5);
    d.setFullYear(99);
    expect(toDateInput(d)).toBe('0099-01-05');
  });
});

describe('toDateTimeInput', () => {
  it('gives the local date and time', () => {
    expect(toDateTimeInput(new Date(2026, 10, 17, 9, 5))).toBe('2026-11-17T09:05');
  });

  it('round-trips through the input value', () => {
    const value = '2026-11-17T23:45';
    expect(toDateTimeInput(new Date(value).toISOString())).toBe(value);
  });
});

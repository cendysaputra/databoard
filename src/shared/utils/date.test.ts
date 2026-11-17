import { describe, expect, it } from 'vitest';
import { formatTime, fromIsoDay, occursOn } from './date';

const day = (iso: string) => fromIsoDay(iso);
const event = (start: string, end: string) => ({
  start_at: new Date(start).toISOString(),
  end_at: new Date(end).toISOString(),
});

describe('occursOn', () => {
  it('shows a timed event on its own day only', () => {
    const e = event('2026-11-17T09:00', '2026-11-17T10:00');
    expect(occursOn(e, day('2026-11-16'))).toBe(false);
    expect(occursOn(e, day('2026-11-17'))).toBe(true);
    expect(occursOn(e, day('2026-11-18'))).toBe(false);
  });

  it('shows a multi-day event on every day it covers', () => {
    const e = event('2026-11-17T20:00', '2026-11-19T08:00');
    expect(occursOn(e, day('2026-11-17'))).toBe(true);
    expect(occursOn(e, day('2026-11-18'))).toBe(true);
    expect(occursOn(e, day('2026-11-19'))).toBe(true);
    expect(occursOn(e, day('2026-11-20'))).toBe(false);
  });

  it('keeps an event ending at midnight off the next day', () => {
    const e = event('2026-11-17T00:00', '2026-11-18T00:00');
    expect(occursOn(e, day('2026-11-17'))).toBe(true);
    expect(occursOn(e, day('2026-11-18'))).toBe(false);
  });

  it('counts a zero-length event on its start day', () => {
    const e = event('2026-11-17T00:00', '2026-11-17T00:00');
    expect(occursOn(e, day('2026-11-16'))).toBe(false);
    expect(occursOn(e, day('2026-11-17'))).toBe(true);
  });

  it('works across a month and year end', () => {
    const e = event('2026-12-31T22:00', '2027-01-01T02:00');
    expect(occursOn(e, day('2026-12-31'))).toBe(true);
    expect(occursOn(e, day('2027-01-01'))).toBe(true);
  });
});

describe('fromIsoDay', () => {
  it('reads a day as local midnight', () => {
    const d = fromIsoDay('2026-11-17');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 17, 0]);
  });
});

describe('formatTime', () => {
  it('uses the Indonesian time format', () => {
    expect(formatTime(new Date(2026, 10, 17, 9, 5))).toBe('09.05');
  });
});

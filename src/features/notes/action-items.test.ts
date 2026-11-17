import { describe, expect, it } from 'vitest';
import { hasOpenTasks, parseActionItems } from './action-items';

const local = (value: string) => new Date(value).toISOString();

describe('parseActionItems', () => {
  it('reads a dated task with a time', () => {
    expect(parseActionItems('- [ ] Kirim notulen @2026-11-20 14:30')).toEqual([
      { message: 'Kirim notulen', remindAt: local('2026-11-20T14:30') },
    ]);
  });

  it('defaults to 09:00 and accepts a dot or T separator', () => {
    const items = parseActionItems(
      ['- [ ] A @2026-11-20', '* [ ] B @2026-11-20T8.05', '  - [ ] C @2026-11-20 7:00'].join('\n'),
    );
    expect(items.map((i) => i.remindAt)).toEqual([
      local('2026-11-20T09:00'),
      local('2026-11-20T08:05'),
      local('2026-11-20T07:00'),
    ]);
  });

  it('skips done, undated and invalid tasks', () => {
    const md = [
      '- [x] Selesai @2026-11-20',
      '- [ ] Tanpa tanggal',
      '- [ ] Jam salah @2026-11-20 25:00',
      'Paragraf @2026-11-20',
    ].join('\n');
    expect(parseActionItems(md)).toEqual([]);
  });

  it('unescapes markdown in the message', () => {
    expect(parseActionItems('- [ ] Cek \\*draft\\* &amp; kirim @2026-11-20')[0]?.message).toBe(
      'Cek *draft* & kirim',
    );
  });
});

describe('hasOpenTasks', () => {
  it('finds an open task with text', () => {
    expect(hasOpenTasks('Intro\n- [ ] Tugas')).toBe(true);
  });

  it('ignores done and empty tasks', () => {
    expect(hasOpenTasks('- [x] Tugas\n- [ ] ')).toBe(false);
  });
});

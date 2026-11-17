import { describe, expect, it } from 'vitest';
import { fileName } from './export';

describe('fileName', () => {
  it('replaces characters Windows does not allow', () => {
    expect(fileName('Rapat: Q4 / 2026?', 'catatan')).toBe('Rapat Q4 2026');
  });

  it('falls back when the title is empty', () => {
    expect(fileName('   ', 'catatan')).toBe('catatan');
  });

  it('caps the length at 80 characters', () => {
    expect(fileName('a'.repeat(200), 'x')).toHaveLength(80);
  });
});

import { describe, expect, it } from 'vitest';
import { unescapeMarkdown } from './markdown-text';

describe('unescapeMarkdown', () => {
  it('drops markdown escapes', () => {
    expect(unescapeMarkdown('2 \\* 3 \\_x\\_ \\[a\\] \\~ \\`')).toBe('2 * 3 _x_ [a] ~ `');
  });

  it('keeps an escaped backslash as one', () => {
    expect(unescapeMarkdown('C:\\\\data')).toBe('C:\\data');
  });

  it('decodes the entities the editor writes', () => {
    expect(unescapeMarkdown('a &lt;b&gt; &amp; c')).toBe('a <b> & c');
  });

  it('decodes &amp; last, so &amp;lt; stays literal', () => {
    expect(unescapeMarkdown('&amp;lt;')).toBe('&lt;');
  });

  it('leaves plain text alone', () => {
    expect(unescapeMarkdown('Rapat tim jam 9')).toBe('Rapat tim jam 9');
  });
});

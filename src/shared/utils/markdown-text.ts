/**
 * Markdown text as it reads: the editor stores `&`, `<` and `>` as HTML entities and puts a
 * backslash before markdown characters such as `*` and `_`, which must not reach a reminder
 * or an excerpt.
 */
export function unescapeMarkdown(text: string): string {
  return text
    .replace(/\\([\\`*_[\]~])/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

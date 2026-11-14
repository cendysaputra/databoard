/** "Blog Posts!" → "blog-posts" (or "blog_posts" with a different separator). */
export function slugify(value: string, separator: '-' | '_' = '-'): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
}

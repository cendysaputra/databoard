import type { JSONContent } from '@tiptap/react';
import type { IParagraphOptions, ParagraphChild } from 'docx';
import { downloadBlob } from '@/shared/utils/download';

/** What both exports need to know about a note. */
export interface NoteExport {
  title: string;
  /** One line under the title, e.g. the date and labels. */
  meta: string;
  /** The body as the editor's HTML (for PDF) and JSON (for Word). */
  html: string;
  doc: JSONContent;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] ?? ch,
  );

/** A safe file name from the note title. */
export const fileName = (title: string, fallback: string) =>
  title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || fallback;

const PRINT_CSS = `
  @page { margin: 22mm 20mm; }
  body { font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif; color: #17152b; line-height: 1.6; font-size: 11pt; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  .meta { color: #6b6980; margin: 0 0 18pt; font-size: 10pt; }
  h2 { font-size: 15pt; margin: 18pt 0 6pt; }
  h3 { font-size: 12.5pt; margin: 14pt 0 4pt; }
  p { margin: 0 0 8pt; }
  ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
  ul[data-type='taskList'] { list-style: none; padding-left: 0; }
  ul[data-type='taskList'] li { display: flex; gap: 6pt; }
  ul[data-type='taskList'] li p { margin: 0; }
  blockquote { margin: 0 0 8pt; padding-left: 10pt; border-left: 2pt solid #bbb; color: #555; }
  code, pre { font-family: Consolas, monospace; font-size: 10pt; }
  pre { background: #f3f3f6; padding: 8pt; white-space: pre-wrap; }
  hr { border: 0; border-top: 1pt solid #ccc; margin: 14pt 0; }
  a { color: inherit; }
`;

/**
 * Opens the print dialog with only the note in it; choosing "Save as PDF" there makes the
 * file. The note is rendered in a hidden frame so the app's own layout is not printed.
 */
export function exportPdf({ title, meta, html }: NoteExport): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>${PRINT_CSS}</style></head>
    <body><h1>${escapeHtml(title)}</h1><p class="meta">${escapeHtml(meta)}</p>${html}</body></html>`;
  frame.onload = () => {
    const view = frame.contentWindow;
    if (!view) return;
    view.onafterprint = () => frame.remove();
    view.focus();
    view.print();
  };
  document.body.append(frame);
}

/** Builds a Word document from the note and starts its download. */
export async function exportDocx({ title, meta, doc }: NoteExport, name: string): Promise<void> {
  // The library is large, so it is only loaded when an export is asked for.
  const docx = await import('docx');
  const { Paragraph, TextRun, ExternalHyperlink, HeadingLevel, LevelFormat, AlignmentType } = docx;

  /** Inline content (text with marks, links, line breaks) of one block. */
  const inline = (nodes: JSONContent[] = [], base: { italics?: boolean } = {}): ParagraphChild[] =>
    nodes.flatMap((node): ParagraphChild[] => {
      if (node.type === 'hardBreak') return [new TextRun({ break: 1 })];
      if (node.type !== 'text' || !node.text) return [];
      const has = (mark: string) => node.marks?.some((m) => m.type === mark) ?? false;
      const link = node.marks?.find((m) => m.type === 'link')?.attrs?.href as string | undefined;
      const run = new TextRun({
        text: node.text,
        bold: has('bold'),
        italics: has('italic') || base.italics,
        strike: has('strike'),
        underline: has('underline') ? {} : undefined,
        font: has('code') ? 'Consolas' : undefined,
        style: link ? 'Hyperlink' : undefined,
      });
      return link ? [new ExternalHyperlink({ link, children: [run] })] : [run];
    });

  /** Paragraphs for a list of block nodes; `options` carries list or quote formatting. */
  const blocks = (
    nodes: JSONContent[] = [],
    options: IParagraphOptions = {},
    depth = 0,
  ): InstanceType<typeof Paragraph>[] =>
    nodes.flatMap((node) => {
      switch (node.type) {
        case 'heading':
          return [
            new Paragraph({
              ...options,
              heading: node.attrs?.level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
              children: inline(node.content),
            }),
          ];
        case 'bulletList':
        case 'orderedList':
        case 'taskList':
          return (node.content ?? []).flatMap((item) => {
            const [first, ...rest] = item.content ?? [];
            const marker: IParagraphOptions =
              node.type === 'bulletList'
                ? { bullet: { level: depth } }
                : node.type === 'orderedList'
                  ? { numbering: { reference: 'numbered', level: depth } }
                  : { indent: { left: 360 * (depth + 1), hanging: 360 } };
            const box = node.type === 'taskList' ? (item.attrs?.checked ? '☑ ' : '☐ ') : '';
            return [
              new Paragraph({
                ...marker,
                children: [...(box ? [new TextRun(box)] : []), ...inline(first?.content)],
              }),
              // Nested lists and further paragraphs inside the item.
              ...blocks(rest, { indent: { left: 360 * (depth + 1) } }, depth + 1),
            ];
          });
        case 'blockquote':
          return (node.content ?? []).map(
            (child) =>
              new Paragraph({
                indent: { left: 480 },
                children: inline(child.content, { italics: true }),
              }),
          );
        case 'codeBlock':
          return [
            new Paragraph({
              ...options,
              children: (node.content?.[0]?.text ?? '')
                .split('\n')
                .map((line, i) => new TextRun({ text: line, font: 'Consolas', break: i ? 1 : 0 })),
            }),
          ];
        case 'horizontalRule':
          return [new Paragraph({ thematicBreak: true })];
        default:
          return [new Paragraph({ ...options, children: inline(node.content) })];
      }
    });

  const file = new docx.Document({
    title,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    numbering: {
      config: [
        {
          reference: 'numbered',
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: meta, color: '6B6980' })],
          }),
          ...blocks(doc.content),
        ],
      },
    ],
  });

  downloadBlob(await docx.Packer.toBlob(file), `${name}.docx`);
}

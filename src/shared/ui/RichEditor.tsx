import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { t } from '@/shared/i18n/id';
import { cn } from '@/shared/utils/cn';

const text = t.notes.toolbar;

interface Tool {
  label: string;
  icon: LucideIcon;
  /** Name (and attributes) used to tell whether the tool is active at the cursor. */
  active?: [string, Record<string, unknown>?];
  run(editor: Editor): void;
}

const setLink = (editor: Editor) => {
  const current = (editor.getAttributes('link').href as string | undefined) ?? 'https://';
  const href = window.prompt(text.linkPrompt, current);
  if (href === null) return;
  const chain = editor.chain().focus().extendMarkRange('link');
  if (href.trim() === '' || href.trim() === 'https://') chain.unsetLink().run();
  else chain.setLink({ href: href.trim() }).run();
};

/** Toolbar groups, separated by a thin divider. */
const toolGroups: Tool[][] = [
  [
    {
      label: text.h2,
      icon: Heading2,
      active: ['heading', { level: 2 }],
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: text.h3,
      icon: Heading3,
      active: ['heading', { level: 3 }],
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      label: text.bold,
      icon: Bold,
      active: ['bold'],
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: text.italic,
      icon: Italic,
      active: ['italic'],
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: text.underline,
      icon: Underline,
      active: ['underline'],
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      label: text.strike,
      icon: Strikethrough,
      active: ['strike'],
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    { label: text.link, icon: LinkIcon, active: ['link'], run: setLink },
  ],
  [
    {
      label: text.bulletList,
      icon: List,
      active: ['bulletList'],
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: text.orderedList,
      icon: ListOrdered,
      active: ['orderedList'],
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: text.taskList,
      icon: ListChecks,
      active: ['taskList'],
      run: (e) => e.chain().focus().toggleTaskList().run(),
    },
  ],
  [
    {
      label: text.quote,
      icon: Quote,
      active: ['blockquote'],
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      label: text.code,
      icon: Code,
      active: ['codeBlock'],
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    { label: text.divider, icon: Minus, run: (e) => e.chain().focus().setHorizontalRule().run() },
  ],
  [
    { label: text.undo, icon: Undo2, run: (e) => e.chain().focus().undo().run() },
    { label: text.redo, icon: Redo2, run: (e) => e.chain().focus().redo().run() },
  ],
];

function Toolbar({ editor }: { editor: Editor }) {
  // Re-render when the selection moves, so the active buttons follow the cursor.
  const activeLabels = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      toolGroups
        .flat()
        .filter((tool) => tool.active && current.isActive(...tool.active))
        .map((tool) => tool.label)
        .join('|'),
  });
  const active = new Set(activeLabels.split('|'));

  return (
    <div
      role="toolbar"
      className="editor-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-bg py-2"
    >
      {toolGroups.map((group, index) => (
        <div
          key={index}
          className={cn(
            'editor-tool-group flex gap-0.5',
            index > 0 && 'ml-1.5 border-l border-border pl-1.5',
          )}
        >
          {group.map((tool) => (
            <button
              key={tool.label}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              aria-pressed={tool.active ? active.has(tool.label) : undefined}
              // Keep the text selection while clicking a tool.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => tool.run(editor)}
              className={cn(
                'flex size-8 items-center justify-center rounded-sm transition-colors',
                active.has(tool.label)
                  ? 'bg-accent text-accent-contrast'
                  : 'text-muted hover:bg-surface-hover hover:text-text',
              )}
            >
              <tool.icon aria-hidden className="size-4" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

interface RichEditorProps {
  /** The document as markdown; read once when the editor is created. */
  initialMarkdown: string;
  onChange?(markdown: string): void;
  /** Hands the editor to the parent, which needs it for export. */
  onReady?(editor: Editor): void;
  /** Shows the document without a toolbar and without letting it be changed. */
  readOnly?: boolean;
}

/** WYSIWYG editor (headings, lists, checklists, quotes, links…) that stores markdown. */
export function RichEditor({
  initialMarkdown,
  onChange,
  onReady,
  readOnly = false,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: t.notes.form.bodyPlaceholder }),
      Markdown,
    ],
    content: initialMarkdown,
    contentType: 'markdown',
    editable: !readOnly,
    editorProps: { attributes: { class: readOnly ? 'rich-text' : 'rich-text min-h-72 py-5' } },
    onUpdate: ({ editor: current }) => onChange?.(current.getMarkdown()),
  });

  useEffect(() => {
    if (editor) onReady?.(editor);
  }, [editor, onReady]);

  if (!editor) return null;

  return (
    <div>
      {!readOnly && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

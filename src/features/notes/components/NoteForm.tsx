import type { Editor } from '@tiptap/react';
import { Download } from 'lucide-react';
import { useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import type { Note, NoteInput, NoteStatus, Tag } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { Input } from '@/shared/ui/Input';
import { formatLongDate, fromIsoDay } from '@/shared/utils/date';
import { toDateInput } from '@/shared/utils/datetime-input';
import { exportDocx, exportPdf, fileName, type NoteExport } from '../export';
import { LabelChip } from './LabelChip';
import { LabelManager } from './LabelManager';
import { RichEditor } from './RichEditor';

const text = t.notes.form;

interface NoteFormProps {
  /** The note being edited; leave out to create a new one. */
  note?: Note;
  labels: Tag[];
  saving: boolean;
  error: unknown;
  onSubmit(input: NoteInput): void;
  /** Extra actions at the end of the action row, e.g. delete. */
  extra?: ReactNode;
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-4">
      <span className="w-24 shrink-0 text-sm text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** A note page: title, date, labels, a rich text body, plus publish and export actions. */
export function NoteForm({ note, labels, saving, error, onSubmit, extra }: NoteFormProps) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [date, setDate] = useState(() => note?.note_date ?? toDateInput(new Date()));
  const [labelIds, setLabelIds] = useState(note?.label_ids ?? []);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [body, setBody] = useState(note?.body_md ?? '');
  const [managing, setManaging] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const editorRef = useRef<Editor | null>(null);
  const onReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const status: NoteStatus = note?.status ?? 'draft';
  const selected = labels.filter((label) => labelIds.includes(label.id));

  const save = (nextStatus: NoteStatus) =>
    onSubmit({
      title,
      body_md: body,
      pinned,
      note_date: date,
      status: nextStatus,
      label_ids: selected.map((label) => label.id),
      // Links to an event or project are kept as they are; linking comes later.
      event_id: note?.event_id ?? null,
      project_id: note?.project_id ?? null,
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(status);
  };

  const exportData = (): NoteExport | null => {
    const editor = editorRef.current;
    if (!editor) return null;
    const meta = [formatLongDate(fromIsoDay(date)), ...selected.map((label) => label.name)];
    return {
      title: title.trim() || text.titlePlaceholder,
      meta: meta.join(' · '),
      html: editor.getHTML(),
      doc: editor.getJSON(),
    };
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
      className="note-editor-panel flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-surface-hover px-3 py-1 text-xs font-medium text-muted">
          {t.notes.status[status]}
        </span>
        <div className="flex-1" />

        <details className="relative">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-sm border border-border px-3.5 text-sm font-medium transition-colors hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
            <Download aria-hidden className="size-4" />
            {text.export}
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-surface p-1.5 shadow-xl">
            <button
              type="button"
              className="block w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
              onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                const data = exportData();
                if (data) {
                  exportDocx(data, fileName(title, text.untitled)).catch(setExportError);
                }
              }}
            >
              {text.exportDocx}
            </button>
            <button
              type="button"
              title={text.exportPdfHint}
              className="block w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
              onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                const data = exportData();
                if (data) exportPdf(data);
              }}
            >
              {text.exportPdf}
              <span className="block text-xs text-muted">{text.exportPdfHint}</span>
            </button>
          </div>
        </details>

        <Button
          disabled={saving}
          onClick={() => save(status === 'published' ? 'draft' : 'published')}
        >
          {status === 'published' ? text.unpublish : text.publish}
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {t.common.save}
        </Button>
        {extra}
      </div>

      <input
        aria-label={text.title}
        placeholder={text.titlePlaceholder}
        required
        autoFocus={!note}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="w-full bg-transparent text-3xl leading-tight font-semibold tracking-tight outline-none placeholder:text-muted"
      />

      <div className="flex flex-col gap-1 border-b border-border pb-5">
        <MetaRow label={text.date}>
          <Input
            type="date"
            required
            aria-label={text.date}
            style={{ maxWidth: '12rem' }}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </MetaRow>
        <MetaRow label={text.labels}>
          <div className="flex flex-wrap items-center gap-1.5">
            {labels.map((label) => (
              <LabelChip
                key={label.id}
                active={labelIds.includes(label.id)}
                onClick={() =>
                  setLabelIds((ids) =>
                    ids.includes(label.id)
                      ? ids.filter((id) => id !== label.id)
                      : [...ids, label.id],
                  )
                }
              >
                {label.name}
              </LabelChip>
            ))}
            <button
              type="button"
              onClick={() => setManaging(true)}
              className="rounded-sm px-2 py-1 text-xs text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
            >
              {t.notes.labels.manage}
            </button>
          </div>
        </MetaRow>
        <MetaRow label={t.notes.pinned}>
          <label className="flex w-fit items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-(--accent)"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
            />
            {text.pin}
          </label>
        </MetaRow>
      </div>

      <RichEditor initialMarkdown={note?.body_md ?? ''} onChange={setBody} onReady={onReady} />

      <FormError error={error ?? exportError} />

      <LabelManager open={managing} onClose={() => setManaging(false)} labels={labels} />
    </form>
  );
}

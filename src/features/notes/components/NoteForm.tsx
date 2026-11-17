import { Link } from '@tanstack/react-router';
import type { Editor } from '@tiptap/react';
import { Download } from 'lucide-react';
import { useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { DataError } from '@/data';
import { t } from '@/shared/i18n/id';
import type { Note, NoteInput, NoteStatus, Tag } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { formatDayMonthYear, formatLongDate, fromIsoDay } from '@/shared/utils/date';
import { toDateInput } from '@/shared/utils/datetime-input';
import { useLeaveGuard } from '@/shared/hooks/use-leave-guard';
import { useLinkableEvents, useLinkedEvent } from '../api';
import { exportDocx, exportPdf, fileName, type NoteExport } from '../export';
import { LabelChip } from '@/shared/ui/LabelChip';
import { ActionItems } from './ActionItems';
import { LabelManager } from './LabelManager';
import { RichEditor } from '@/shared/ui/RichEditor';

const text = t.notes.form;

/** What a new note starts with when it is written for an event. */
export interface NotePrefill {
  title: string;
  /** The day of the event, as `YYYY-MM-DD`. */
  date: string;
  eventId: string;
}

/** Puts the meeting sections into the editor: a heading each, then an empty checklist. */
function insertMeetingTemplate(editor: Editor, focus: boolean) {
  const { sections, actionItems } = t.notes.template;
  const heading = (name: string) => ({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: name }],
  });
  const chain = focus ? editor.chain().focus('end') : editor.chain();
  chain
    .insertContent([
      ...sections.flatMap((name) => [heading(name), { type: 'paragraph' }]),
      heading(actionItems),
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
        ],
      },
    ])
    .run();
}

interface NoteFormProps {
  /** The note being edited; leave out to create a new one. */
  note?: Note;
  /** For a new note made from an event: its title, day and link, plus the meeting template. */
  prefill?: NotePrefill;
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
      <span className="note-meta-label w-24 shrink-0 text-sm text-muted">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** A note page: title, date, labels, a rich text body, plus publish and export actions. */
export function NoteForm({ note, prefill, labels, saving, error, onSubmit, extra }: NoteFormProps) {
  const [title, setTitle] = useState(note?.title ?? prefill?.title ?? '');
  const [date, setDate] = useState(
    () => note?.note_date ?? prefill?.date ?? toDateInput(new Date()),
  );
  const [eventId, setEventId] = useState(note?.event_id ?? prefill?.eventId ?? null);
  const [labelIds, setLabelIds] = useState(note?.label_ids ?? []);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [body, setBody] = useState(note?.body_md ?? '');
  /** The body as it was opened, after any template, to tell whether it was changed. */
  const [openedBody, setOpenedBody] = useState(note?.body_md ?? '');
  const [managing, setManaging] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const editorRef = useRef<Editor | null>(null);
  const fromEvent = Boolean(prefill);
  const onReady = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      // A note written for an event starts as meeting notes; only once, while still empty.
      if (fromEvent && editor.isEmpty) {
        insertMeetingTemplate(editor, false);
        // The template is where the note starts, not a change to warn about on leaving.
        setOpenedBody(editor.getMarkdown());
      }
    },
    [fromEvent],
  );

  // The select offers recent and coming events; a link to an older one is fetched by itself.
  const nearby = useLinkableEvents().data ?? [];
  const isNearby = nearby.some((event) => event.id === eventId);
  const linkedEvent = useLinkedEvent(isNearby ? null : eventId);
  const linked = linkedEvent.data;
  const events = linked && !isNearby ? [linked, ...nearby] : nearby;
  // A link to an event that no longer exists counts as no link; saving the note drops it.
  const linkMissing = !isNearby && (linkedEvent.error as DataError | null)?.code === 'not_found';
  const linkedId = linkMissing ? null : eventId;

  const status: NoteStatus = note?.status ?? 'draft';
  const selected = labels.filter((label) => labelIds.includes(label.id));

  const [openedDate] = useState(date);
  const sameLabels = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join();
  const dirty = note
    ? title !== note.title ||
      date !== note.note_date ||
      eventId !== note.event_id ||
      pinned !== note.pinned ||
      !sameLabels(labelIds, note.label_ids) ||
      body !== note.body_md
    : title !== (prefill?.title ?? '') ||
      date !== openedDate ||
      pinned ||
      labelIds.length > 0 ||
      body !== openedBody;
  const leaveDialog = useLeaveGuard(dirty);

  const save = (nextStatus: NoteStatus) => {
    // Ctrl+S skips the disabled button; one save at a time, or a new note is made twice.
    if (saving) return;
    onSubmit({
      title,
      body_md: body,
      pinned,
      note_date: date,
      status: nextStatus,
      label_ids: selected.map((label) => label.id),
      event_id: linkedId,
      // The link to a project is kept as it is.
      project_id: note?.project_id ?? null,
    });
  };

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
      <div className="note-actions flex flex-wrap items-center gap-2">
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
          className="note-action-main"
          disabled={saving}
          onClick={() => save(status === 'published' ? 'draft' : 'published')}
        >
          {status === 'published' ? text.unpublish : text.publish}
        </Button>
        <Button type="submit" variant="primary" className="note-action-main" disabled={saving}>
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
            className="sm:max-w-48"
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
              className="rounded-sm px-2 py-1 text-xs text-muted transition-colors hover:text-text"
            >
              {t.notes.labels.manage}
            </button>
          </div>
        </MetaRow>
        <MetaRow label={text.event}>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              aria-label={text.event}
              className="sm:max-w-80"
              value={linkedId ?? ''}
              onChange={(event) => setEventId(event.target.value || null)}
            >
              <option value="">{text.eventNone}</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {formatDayMonthYear(event.start_at)} · {event.title}
                </option>
              ))}
            </Select>
            {linkedId && (
              <Link
                to="/calendar/$eventId"
                params={{ eventId: linkedId }}
                className="text-xs text-muted transition-colors hover:text-text"
              >
                {text.eventOpen}
              </Link>
            )}
          </div>
        </MetaRow>
        <MetaRow label={text.template}>
          <LabelChip
            onClick={() => {
              if (editorRef.current) insertMeetingTemplate(editorRef.current, true);
            }}
          >
            {t.notes.template.meeting}
          </LabelChip>
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

      <ActionItems noteId={note?.id} body={body} />

      <FormError error={error ?? exportError} />

      <LabelManager open={managing} onClose={() => setManaging(false)} labels={labels} />
      {leaveDialog}
    </form>
  );
}

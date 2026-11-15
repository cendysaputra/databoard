import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Pin, Plus } from 'lucide-react';
import { lazy, useState } from 'react';
import { useSelection } from '@/shared/hooks/use-selection';
import { t } from '@/shared/i18n/id';
import type { Note, Tag } from '@/shared/types';
import { Button, buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FormError } from '@/shared/ui/FormError';
import { NotesIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { SelectionBar } from '@/shared/ui/SelectionBar';
import { formatDayMonth, fromIsoDay } from '@/shared/utils/date';
import { useLabels, useNote, useNotes, useRemoveNote, useRemoveNotes, useSaveNote } from './api';
import { LabelChip } from './components/LabelChip';
import { LabelManager } from './components/LabelManager';

// The editor is heavy (rich text engine), so it loads only when a note is opened,
// not with the list.
const NoteForm = lazy(() =>
  import('./components/NoteForm').then((module) => ({ default: module.NoteForm })),
);

function NoteList({ labels }: { labels: Tag[] }) {
  const [labelId, setLabelId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  // A label deleted while selected no longer filters.
  const activeLabel = labels.some((label) => label.id === labelId) ? labelId : null;
  const notes = useNotes(activeLabel);
  const nameOf = (id: string) => labels.find((label) => label.id === id)?.name;
  // Picks follow the notes on screen, so changing the label filter narrows them too.
  const selection = useSelection((notes.data ?? []).map((note) => note.id));
  const remove = useRemoveNotes();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <LabelChip active={activeLabel === null} onClick={() => setLabelId(null)}>
          {t.notes.allLabels}
        </LabelChip>
        {labels.map((label) => (
          <LabelChip
            key={label.id}
            active={activeLabel === label.id}
            onClick={() => setLabelId(label.id)}
          >
            {label.name}
          </LabelChip>
        ))}
        <div className="flex-1" />
        {(notes.data?.length ?? 0) > 0 && (
          <SelectionBar
            selection={selection}
            deleting={remove.isPending}
            onDelete={(ids) => remove.mutate(ids)}
          />
        )}
        <Button variant="ghost" onClick={() => setManaging(true)}>
          {t.notes.labels.manage}
        </Button>
      </div>
      <FormError error={remove.error} />

      <QueryBoundary query={notes}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon={NotesIcon}
              title={t.notes.emptyTitle}
              body={activeLabel ? t.notes.emptyFiltered : t.notes.emptyBody}
            />
          ) : (
            <Rows>
              {items.map((note) => (
                <Row
                  key={note.id}
                  select={
                    selection.active
                      ? {
                          checked: selection.isSelected(note.id),
                          label: t.common.selectItem(note.title),
                          onChange: () => selection.toggle(note.id),
                        }
                      : undefined
                  }
                  lead={formatDayMonth(fromIsoDay(note.note_date))}
                  trail={
                    <span className="flex items-center gap-2">
                      {note.pinned && (
                        <Pin aria-label={t.notes.pinned} className="size-3.5 text-accent-2" />
                      )}
                      {t.notes.status[note.status]}
                    </span>
                  }
                >
                  <div className="flex items-center gap-2">
                    <Link
                      to="/notes/$noteId"
                      params={{ noteId: note.id }}
                      className="truncate font-medium after:absolute after:inset-0"
                    >
                      {note.title}
                    </Link>
                    {note.label_ids.map((id) => (
                      <span
                        key={id}
                        className="shrink-0 rounded-sm bg-surface-hover px-2 py-0.5 text-xs text-muted"
                      >
                        {nameOf(id)}
                      </span>
                    ))}
                  </div>
                  <p className="truncate text-sm text-muted">{note.excerpt}</p>
                </Row>
              ))}
            </Rows>
          )
        }
      </QueryBoundary>

      <LabelManager open={managing} onClose={() => setManaging(false)} labels={labels} />
    </>
  );
}

/** Notes with a label filter. Search and linking to events come later. */
export function NotesPage() {
  const labels = useLabels();

  return (
    <>
      <PageHeader
        title={t.notes.title}
        actions={
          <Link to="/notes/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {t.notes.new}
          </Link>
        }
      />
      <QueryBoundary query={labels}>{(value) => <NoteList labels={value} />}</QueryBoundary>
    </>
  );
}

function NoteEditor({ note }: { note?: Note }) {
  const navigate = useNavigate();
  const labels = useLabels();
  const save = useSaveNote(note?.id);
  const remove = useRemoveNote();

  return (
    <>
      <QueryBoundary query={labels}>
        {(allLabels) => (
          <NoteForm
            note={note}
            labels={allLabels}
            saving={save.isPending}
            error={save.error ?? remove.error}
            onSubmit={(input) =>
              save.mutate(input, {
                onSuccess: (saved) => {
                  // A new note continues on its own page, so further saves update it.
                  if (!note) {
                    void navigate({
                      to: '/notes/$noteId',
                      params: { noteId: saved.id },
                      replace: true,
                    });
                  }
                },
              })
            }
            extra={
              note && (
                <ConfirmButton
                  label={t.common.delete}
                  disabled={remove.isPending}
                  onConfirm={() =>
                    remove.mutate(note.id, { onSuccess: () => void navigate({ to: '/notes' }) })
                  }
                />
              )
            }
          />
        )}
      </QueryBoundary>
    </>
  );
}

export function NoteNewPage() {
  return <NoteEditor />;
}

export function NoteEditPage() {
  const { noteId = '' } = useParams({ strict: false });
  const note = useNote(noteId);

  return (
    <QueryBoundary query={note}>
      {(value) => <NoteEditor key={value.id} note={value} />}
    </QueryBoundary>
  );
}

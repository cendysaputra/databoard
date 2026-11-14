import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Pin, Plus } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import type { Note } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NotesIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth } from '@/shared/utils/date';
import { useNote, useNotes, useRemoveNote, useSaveNote } from './api';
import { NoteForm } from './components/NoteForm';

/** First line of the note without markdown markers, as a short preview. */
function excerpt(body: string): string {
  const line = body.split('\n').find((text) => text.trim() && !text.startsWith('#')) ?? '';
  return line.replace(/^[-*\s[\]x]+/i, '').trim();
}

/** Lists notes. The rich editor, search and tags come later; adding and editing work now. */
export function NotesPage() {
  const notes = useNotes();

  return (
    <>
      <PageHeader
        title={t.notes.title}
        subtitle={t.notes.subtitle}
        actions={
          <Link to="/notes/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {t.notes.new}
          </Link>
        }
      />
      <QueryBoundary query={notes}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={NotesIcon} title={t.notes.emptyTitle} body={t.notes.emptyBody} />
          ) : (
            <Rows>
              {items.map((note) => (
                <Row
                  key={note.id}
                  lead={formatDayMonth(note.updated_at)}
                  trail={
                    note.pinned && (
                      <Pin aria-label={t.notes.pinned} className="size-3.5 text-accent-2" />
                    )
                  }
                >
                  <Link
                    to="/notes/$noteId"
                    params={{ noteId: note.id }}
                    className="block truncate font-medium after:absolute after:inset-0"
                  >
                    {note.title}
                  </Link>
                  <p className="truncate text-sm text-muted">{excerpt(note.body_md)}</p>
                </Row>
              ))}
            </Rows>
          )
        }
      </QueryBoundary>
    </>
  );
}

function NoteEditor({ note }: { note?: Note }) {
  const navigate = useNavigate();
  const save = useSaveNote(note?.id);
  const remove = useRemoveNote();
  const back = () => void navigate({ to: '/notes' });

  return (
    <>
      <PageHeader title={note ? note.title : t.notes.new} />
      <NoteForm
        note={note}
        saving={save.isPending}
        error={save.error ?? remove.error}
        onCancel={back}
        onSubmit={(input) => save.mutate(input, { onSuccess: back })}
        extra={
          note && (
            <ConfirmButton
              label={t.common.delete}
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(note.id, { onSuccess: back })}
            />
          )
        }
      />
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

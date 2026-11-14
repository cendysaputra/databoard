import { Pin } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import { EmptyState } from '@/shared/ui/EmptyState';
import { NotesIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth } from '@/shared/utils/date';
import { useNotes } from './api';

/** First line of the note without markdown markers, as a short preview. */
function excerpt(body: string): string {
  const line = body.split('\n').find((text) => text.trim() && !text.startsWith('#')) ?? '';
  return line.replace(/^[-*\s[\]x]+/i, '').trim();
}

/** Phase 1 placeholder: lists notes. The editor, search and tags come in phase 3. */
export function NotesPage() {
  const notes = useNotes();

  return (
    <>
      <PageHeader title={t.notes.title} subtitle={t.notes.subtitle} />
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
                      <Pin aria-label={t.notes.pinned} className="size-3.5 text-accent-text" />
                    )
                  }
                >
                  <p className="truncate font-medium">{note.title}</p>
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

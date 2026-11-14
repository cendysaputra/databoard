import { NotebookPen, Pin } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { formatDate } from '@/shared/utils/date';
import { useNotes } from './api';

/** Phase 1 placeholder: lists notes. The editor, search and tags come in phase 3. */
export function NotesPage() {
  const notes = useNotes();

  return (
    <>
      <PageHeader title={t.notes.title} subtitle={t.notes.subtitle} />
      <QueryBoundary query={notes}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={NotebookPen} title={t.notes.emptyTitle} body={t.notes.emptyBody} />
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((note) => (
                <li key={note.id}>
                  <Card className="flex items-baseline justify-between gap-4">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      {note.pinned && (
                        <Pin
                          aria-label={t.notes.pinned}
                          className="size-3.5 shrink-0 text-accent-text"
                        />
                      )}
                      <span className="truncate">{note.title}</span>
                    </span>
                    <span className="shrink-0 text-sm text-muted">
                      {formatDate(note.updated_at)}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </>
  );
}

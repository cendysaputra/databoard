import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Pin, Plus } from 'lucide-react';
import { lazy, useDeferredValue, useState } from 'react';
import { useSelection } from '@/shared/hooks/use-selection';
import { t } from '@/shared/i18n/id';
import type { Note, NoteStatus, Tag } from '@/shared/types';
import { Button, buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FilterSelect } from '@/shared/ui/FilterSelect';
import { FormError } from '@/shared/ui/FormError';
import { Input } from '@/shared/ui/Input';
import { NotesIcon } from '@/shared/ui/icons';
import { pillClass } from '@/shared/ui/LabelChip';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { SelectionBar } from '@/shared/ui/SelectionBar';
import { cn } from '@/shared/utils/cn';
import { formatDayMonth, fromIsoDay } from '@/shared/utils/date';
import { toDateInput } from '@/shared/utils/datetime-input';
import {
  useLabels,
  useLinkedEvent,
  useNote,
  useNotes,
  useRemoveNote,
  useRemoveNotes,
  useSaveNote,
} from './api';
import type { NotePrefill } from './components/NoteForm';
import { LabelManager } from './components/LabelManager';

const text = t.notes;

// The editor is heavy (rich text engine), so it loads only when a note is opened,
// not with the list.
const NoteForm = lazy(() =>
  import('./components/NoteForm').then((module) => ({ default: module.NoteForm })),
);

const statuses = Object.keys(t.notes.status) as NoteStatus[];

function NoteList({ labels }: { labels: Tag[] }) {
  const [labelId, setLabelId] = useState('');
  const [status, setStatus] = useState<NoteStatus | ''>('');
  const [managing, setManaging] = useState(false);
  // A label deleted while selected no longer filters.
  const activeLabel = labels.some((label) => label.id === labelId) ? labelId : null;
  const [search, setSearch] = useState('');
  const notes = useNotes(activeLabel, useDeferredValue(search.trim()));
  const nameOf = (id: string) => labels.find((label) => label.id === id)?.name;
  // The label is filtered by the query; the status is filtered here, on what came back.
  const shown = (notes.data ?? []).filter((note) => !status || note.status === status);
  // Picks follow the notes on screen, so changing a filter narrows them too.
  const selection = useSelection(shown.map((note) => note.id));
  const remove = useRemoveNotes();
  const filtered = Boolean(activeLabel || status || search.trim());

  return (
    <>
      <div className="filter-bar mb-6 flex flex-wrap items-center gap-2">
        {/* Each control fills its box, so the box sets the width. */}
        <div className="filter-search w-56">
          <Input
            type="search"
            aria-label={text.filter.search}
            placeholder={text.filter.searchPlaceholder}
            className="h-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <FilterSelect
          label={text.filter.label}
          all={text.filter.allLabels}
          value={activeLabel ?? ''}
          options={labels.map((label) => ({ value: label.id, label: label.name }))}
          onChange={setLabelId}
        />
        <FilterSelect
          label={text.filter.status}
          all={text.filter.allStatuses}
          value={status}
          options={statuses.map((name) => ({ value: name, label: text.status[name] }))}
          onChange={(value) => setStatus(value as NoteStatus | '')}
        />
        {filtered && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setLabelId('');
              setStatus('');
            }}
          >
            {text.filter.reset}
          </Button>
        )}
        <div className="flex-1" />
        {shown.length > 0 && (
          <SelectionBar
            selection={selection}
            deleting={remove.isPending}
            onDelete={(ids) => remove.mutate(ids)}
          />
        )}
        <Button variant="ghost" onClick={() => setManaging(true)}>
          {text.labels.manage}
        </Button>
      </div>
      <FormError error={remove.error} />

      <QueryBoundary query={notes}>
        {() =>
          shown.length === 0 ? (
            <EmptyState
              icon={NotesIcon}
              title={text.emptyTitle}
              body={filtered ? text.emptyFiltered : text.emptyBody}
            />
          ) : (
            <Rows>
              {shown.map((note) => (
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
                        <Pin aria-label={text.pinned} className="size-3.5 text-accent-2" />
                      )}
                      {text.status[note.status]}
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
                      <span key={id} className={cn('shrink-0', pillClass)}>
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

/** Notes filtered by label and status. */
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

function NoteEditor({ note, prefill }: { note?: Note; prefill?: NotePrefill }) {
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
            prefill={prefill}
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

/** A new note. With `?event=<id>` it starts as meeting notes for that event. */
export function NoteNewPage() {
  const { event: eventId } = useSearch({ strict: false });
  const event = useLinkedEvent(eventId ?? null);

  if (!eventId) return <NoteEditor />;
  return (
    <QueryBoundary query={event}>
      {(value) => (
        <NoteEditor
          prefill={{ title: value.title, date: toDateInput(value.start_at), eventId: value.id }}
        />
      )}
    </QueryBoundary>
  );
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

import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { t } from '@/shared/i18n/id';
import type { Collection, Entry } from '@/shared/types';
import { buttonClass } from '@/shared/ui/Button';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CollectionIcon } from '@/shared/ui/icons';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryBoundary } from '@/shared/ui/QueryBoundary';
import { Row, Rows } from '@/shared/ui/Rows';
import { formatDayMonth } from '@/shared/utils/date';
import {
  useCollection,
  useCollections,
  useEntries,
  useEntry,
  useRemoveCollection,
  useRemoveEntry,
  useSaveCollection,
  useSaveEntry,
} from './api';
import { BlueprintForm } from './components/BlueprintForm';
import { EntryForm } from './components/EntryForm';

const text = t.collections;

/** Route params of the pages below; every page under a collection has its id. */
function useIds() {
  const { collectionId = '', entryId = '' } = useParams({ strict: false });
  return { collectionId, entryId };
}

/** Makes the whole row clickable while keeping one real link for keyboards. */
const rowLink = 'font-medium after:absolute after:inset-0';

export function CollectionsPage() {
  const collections = useCollections();

  return (
    <>
      <PageHeader
        title={text.title}
        subtitle={text.subtitle}
        actions={
          <Link to="/collections/new" className={buttonClass('primary')}>
            <Plus aria-hidden className="size-4" />
            {text.new}
          </Link>
        }
      />
      <QueryBoundary query={collections}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={CollectionIcon} title={text.emptyTitle} body={text.emptyBody} />
          ) : (
            <Rows>
              {items.map((collection) => (
                <Row
                  key={collection.id}
                  lead={collection.slug}
                  trail={text.entryCount(collection.entry_count)}
                >
                  <Link
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    className={rowLink}
                  >
                    {collection.name}
                  </Link>
                  {collection.description && (
                    <p className="truncate text-sm text-muted">{collection.description}</p>
                  )}
                </Row>
              ))}
            </Rows>
          )
        }
      </QueryBoundary>
    </>
  );
}

export function CollectionNewPage() {
  const navigate = useNavigate();
  const save = useSaveCollection();

  return (
    <>
      <PageHeader title={text.blueprint.newTitle} />
      <BlueprintForm
        saving={save.isPending}
        error={save.error}
        onCancel={() => void navigate({ to: '/collections' })}
        onSubmit={(input) =>
          save.mutate(input, {
            onSuccess: (created) =>
              void navigate({
                to: '/collections/$collectionId',
                params: { collectionId: created.id },
              }),
          })
        }
      />
    </>
  );
}

function EditBlueprint({ collection }: { collection: Collection }) {
  const navigate = useNavigate();
  const save = useSaveCollection(collection.id);
  const remove = useRemoveCollection();
  const back = () =>
    void navigate({ to: '/collections/$collectionId', params: { collectionId: collection.id } });

  return (
    <>
      <PageHeader
        title={text.blueprint.editTitle(collection.name)}
        actions={
          <ConfirmButton
            label={text.blueprint.deleteCollection}
            disabled={remove.isPending}
            onConfirm={() =>
              remove.mutate(collection.id, {
                onSuccess: () => void navigate({ to: '/collections' }),
              })
            }
          />
        }
      />
      <BlueprintForm
        collection={collection}
        saving={save.isPending}
        error={save.error ?? remove.error}
        onCancel={back}
        onSubmit={(input) => save.mutate(input, { onSuccess: back })}
      />
    </>
  );
}

export function CollectionEditPage() {
  const { collectionId } = useIds();
  const collection = useCollection(collectionId);

  return (
    <QueryBoundary query={collection}>
      {(value) => <EditBlueprint key={value.id} collection={value} />}
    </QueryBoundary>
  );
}

/** A short preview of an entry: its first non-empty text value. */
function entrySummary(collection: Collection, entry: Entry): string {
  for (const field of collection.fields) {
    const value = entry.data[field.key];
    if (typeof value === 'string' && value.trim()) return value.replace(/[#*_`>-]/g, '').trim();
  }
  return '';
}

function EntryList({ collection }: { collection: Collection }) {
  const entries = useEntries(collection.id);
  const params = { collectionId: collection.id };

  return (
    <>
      <PageHeader
        title={collection.name}
        subtitle={collection.description ?? undefined}
        actions={
          <div className="flex gap-2">
            <Link to="/collections/$collectionId/edit" params={params} className={buttonClass()}>
              {text.blueprint.edit}
            </Link>
            <Link
              to="/collections/$collectionId/entries/new"
              params={params}
              className={buttonClass('primary')}
            >
              <Plus aria-hidden className="size-4" />
              {text.entries.new}
            </Link>
          </div>
        }
      />
      <QueryBoundary query={entries}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState
              icon={CollectionIcon}
              title={text.entries.emptyTitle}
              body={text.entries.emptyBody}
            />
          ) : (
            <Rows>
              {items.map((entry) => (
                <Row
                  key={entry.id}
                  lead={formatDayMonth(entry.updated_at)}
                  trail={text.entries.statuses[entry.status]}
                >
                  <Link
                    to="/collections/$collectionId/entries/$entryId"
                    params={{ ...params, entryId: entry.id }}
                    className={rowLink}
                  >
                    {entry.title}
                  </Link>
                  <p className="truncate text-sm text-muted">{entrySummary(collection, entry)}</p>
                </Row>
              ))}
            </Rows>
          )
        }
      </QueryBoundary>
    </>
  );
}

export function CollectionPage() {
  const { collectionId } = useIds();
  const collection = useCollection(collectionId);

  return (
    <QueryBoundary query={collection}>
      {(value) => <EntryList key={value.id} collection={value} />}
    </QueryBoundary>
  );
}

function EntryEditor({ collection, entry }: { collection: Collection; entry?: Entry }) {
  const navigate = useNavigate();
  const save = useSaveEntry(collection.id, entry?.id);
  const remove = useRemoveEntry();
  const back = () =>
    void navigate({ to: '/collections/$collectionId', params: { collectionId: collection.id } });

  return (
    <>
      <p className="label mb-6">
        <Link
          to="/collections/$collectionId"
          params={{ collectionId: collection.id }}
          className="transition-colors hover:text-text"
        >
          ← {collection.name}
        </Link>
      </p>
      <EntryForm
        collection={collection}
        entry={entry}
        saving={save.isPending}
        error={save.error ?? remove.error}
        onCancel={back}
        onSubmit={(input) => save.mutate(input, { onSuccess: back })}
        extra={
          entry && (
            <ConfirmButton
              label={t.common.delete}
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(entry.id, { onSuccess: back })}
            />
          )
        }
      />
    </>
  );
}

export function EntryNewPage() {
  const { collectionId } = useIds();
  const collection = useCollection(collectionId);

  return (
    <QueryBoundary query={collection}>
      {(value) => <EntryEditor key={value.id} collection={value} />}
    </QueryBoundary>
  );
}

function LoadedEntry({ collection, entryId }: { collection: Collection; entryId: string }) {
  const entry = useEntry(entryId);
  return (
    <QueryBoundary query={entry}>
      {(value) => <EntryEditor key={value.id} collection={collection} entry={value} />}
    </QueryBoundary>
  );
}

export function EntryEditPage() {
  const { collectionId, entryId } = useIds();
  const collection = useCollection(collectionId);

  return (
    <QueryBoundary query={collection}>
      {(value) => <LoadedEntry collection={value} entryId={entryId} />}
    </QueryBoundary>
  );
}

-- 002_collections: user-defined content types (CMS style).
-- A collection owns a blueprint (its field definitions, as a JSON array) and entries.
-- An entry has a built-in title and status; the values of the blueprint fields live in `data`
-- (a JSON object keyed by field key).

CREATE TABLE collections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    description TEXT,
    fields      TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);
-- A slug can be reused once the collection that had it is deleted.
CREATE UNIQUE INDEX idx_collections_slug ON collections (slug) WHERE deleted_at IS NULL;

CREATE TABLE entries (
    id            TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    data          TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    deleted_at    TEXT
);
CREATE INDEX idx_entries_collection ON entries (collection_id, updated_at DESC)
    WHERE deleted_at IS NULL;

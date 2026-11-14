-- 001_init: initial schema.
-- Conventions: id is a UUID v7 (TEXT), timestamps are UTC ISO 8601 strings,
-- deleted_at marks a soft delete. Never edit this file after release; add a new migration.

CREATE TABLE projects (
    id             TEXT PRIMARY KEY,
    title          TEXT NOT NULL,
    client         TEXT,
    year           INTEGER,
    role           TEXT,
    stack          TEXT NOT NULL DEFAULT '[]',
    url            TEXT,
    repo_url       TEXT,
    description_md TEXT NOT NULL DEFAULT '',
    cover_path     TEXT,
    status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    deleted_at     TEXT
);
CREATE INDEX idx_projects_sort ON projects (sort_order) WHERE deleted_at IS NULL;

CREATE TABLE events (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    location    TEXT,
    start_at    TEXT NOT NULL,
    end_at      TEXT NOT NULL,
    all_day     INTEGER NOT NULL DEFAULT 0,
    color       TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);
CREATE INDEX idx_events_range ON events (start_at, end_at) WHERE deleted_at IS NULL;

CREATE TABLE notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    body_md    TEXT NOT NULL DEFAULT '',
    event_id   TEXT REFERENCES events (id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects (id) ON DELETE SET NULL,
    pinned     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
CREATE INDEX idx_notes_updated ON notes (pinned DESC, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_event ON notes (event_id);

CREATE TABLE reminders (
    id         TEXT PRIMARY KEY,
    event_id   TEXT REFERENCES events (id) ON DELETE CASCADE,
    note_id    TEXT REFERENCES notes (id) ON DELETE CASCADE,
    remind_at  TEXT NOT NULL,
    message    TEXT NOT NULL,
    done_at    TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);
CREATE INDEX idx_reminders_due ON reminders (remind_at) WHERE deleted_at IS NULL AND done_at IS NULL;
CREATE INDEX idx_reminders_event ON reminders (event_id);

CREATE TABLE tags (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE taggables (
    tag_id      TEXT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('note', 'project')),
    entity_id   TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT,
    PRIMARY KEY (tag_id, entity_type, entity_id)
);
CREATE INDEX idx_taggables_entity ON taggables (entity_type, entity_id);

CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Full-text index for notes. It keeps its own copy keyed by note id (not rowid),
-- so it stays valid across VACUUM and restore. Soft-deleted notes are not indexed.
CREATE VIRTUAL TABLE notes_fts USING fts5 (
    note_id UNINDEXED,
    title,
    body_md,
    tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER notes_fts_insert AFTER INSERT ON notes WHEN new.deleted_at IS NULL
BEGIN
    INSERT INTO notes_fts (note_id, title, body_md) VALUES (new.id, new.title, new.body_md);
END;

CREATE TRIGGER notes_fts_update AFTER UPDATE ON notes
BEGIN
    DELETE FROM notes_fts WHERE note_id = old.id;
    INSERT INTO notes_fts (note_id, title, body_md)
    SELECT new.id, new.title, new.body_md WHERE new.deleted_at IS NULL;
END;

CREATE TRIGGER notes_fts_delete AFTER DELETE ON notes
BEGIN
    DELETE FROM notes_fts WHERE note_id = old.id;
END;

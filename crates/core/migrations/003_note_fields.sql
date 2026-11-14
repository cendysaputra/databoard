-- 003_note_fields: notes get their own date and a draft/published status.
-- Labels for notes use the existing `tags` and `taggables` tables.

ALTER TABLE notes ADD COLUMN note_date TEXT;
ALTER TABLE notes ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published'));

-- Existing notes take the day they were created as their date.
UPDATE notes SET note_date = substr(created_at, 1, 10);

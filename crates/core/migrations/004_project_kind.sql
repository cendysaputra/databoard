-- 004_project_kind: projects get a kind of work, e.g. "Website" or "Mobile".
-- The names on offer are kept in the settings; a project stores the name itself.

ALTER TABLE projects ADD COLUMN kind TEXT;

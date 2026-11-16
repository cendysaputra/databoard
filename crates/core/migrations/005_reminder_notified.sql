-- When the app showed the reminder as a system notification; NULL while it is still to be shown.
ALTER TABLE reminders ADD COLUMN notified_at TEXT;

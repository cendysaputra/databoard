use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::{AppError, Result};
use crate::util::{new_id, normalize_ts, now, optional, required, soft_delete};

const TABLE: &str = "events";
const COLUMNS: &str =
    "id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at";

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub all_day: bool,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct EventInput {
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub all_day: bool,
    pub color: Option<String>,
}

/// Time window for listing events; both bounds are RFC 3339 timestamps.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct EventRange {
    pub from: String,
    pub to: String,
}

/// Input after trimming and timestamp normalization.
struct Clean {
    title: String,
    description: Option<String>,
    location: Option<String>,
    start_at: String,
    end_at: String,
    color: Option<String>,
}

fn clean(input: &EventInput) -> Result<Clean> {
    let start_at = normalize_ts("start_at", &input.start_at)?;
    let end_at = normalize_ts("end_at", &input.end_at)?;
    if end_at < start_at {
        return Err(AppError::validation("end_at must not be before start_at"));
    }
    Ok(Clean {
        title: required("title", &input.title)?,
        description: optional(input.description.as_deref()),
        location: optional(input.location.as_deref()),
        start_at,
        end_at,
        color: optional(input.color.as_deref()),
    })
}

fn from_row(row: &Row<'_>) -> rusqlite::Result<CalendarEvent> {
    Ok(CalendarEvent {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        location: row.get(3)?,
        start_at: row.get(4)?,
        end_at: row.get(5)?,
        all_day: row.get(6)?,
        color: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

/// Events that overlap the range, earliest first.
pub fn list(conn: &Connection, range: &EventRange) -> Result<Vec<CalendarEvent>> {
    let from = normalize_ts("from", &range.from)?;
    let to = normalize_ts("to", &range.to)?;
    let sql = format!(
        "SELECT {COLUMNS} FROM {TABLE}
         WHERE deleted_at IS NULL AND start_at < ?2 AND end_at >= ?1
         ORDER BY start_at, title"
    );
    let mut stmt = conn.prepare_cached(&sql)?;
    let rows = stmt.query_map(params![from, to], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

/// The next events that have not ended yet at `now`, soonest first.
pub fn upcoming(conn: &Connection, now: &str, limit: u32) -> Result<Vec<CalendarEvent>> {
    let now = normalize_ts("now", now)?;
    let sql = format!(
        "SELECT {COLUMNS} FROM {TABLE}
         WHERE deleted_at IS NULL AND end_at >= ?1
         ORDER BY start_at, title LIMIT ?2"
    );
    let mut stmt = conn.prepare_cached(&sql)?;
    let rows = stmt.query_map(params![now, limit], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn get(conn: &Connection, id: &str) -> Result<CalendarEvent> {
    let sql = format!("SELECT {COLUMNS} FROM {TABLE} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, [id], from_row)
        .optional()?
        .ok_or(AppError::NotFound("event"))
}

pub fn create(conn: &Connection, input: &EventInput) -> Result<CalendarEvent> {
    let c = clean(input)?;
    let (id, now) = (new_id(), now());
    conn.execute(
        "INSERT INTO events
           (id, title, description, location, start_at, end_at, all_day, color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        params![id, c.title, c.description, c.location, c.start_at, c.end_at, input.all_day, c.color, now],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &EventInput) -> Result<CalendarEvent> {
    let c = clean(input)?;
    let changed = conn.execute(
        "UPDATE events
         SET title = ?2, description = ?3, location = ?4, start_at = ?5, end_at = ?6,
             all_day = ?7, color = ?8, updated_at = ?9
         WHERE id = ?1 AND deleted_at IS NULL",
        params![
            id,
            c.title,
            c.description,
            c.location,
            c.start_at,
            c.end_at,
            input.all_day,
            c.color,
            now()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("event"));
    }
    get(conn, id)
}

/// Soft-deletes the event together with its reminders, and unlinks the notes written for it.
/// A soft delete never fires the schema's `ON DELETE` rules, so both are done here.
pub fn remove(conn: &Connection, id: &str) -> Result<()> {
    soft_delete(conn, TABLE, id)?;
    conn.execute(
        "UPDATE reminders SET deleted_at = ?1, updated_at = ?1
         WHERE event_id = ?2 AND deleted_at IS NULL",
        params![now(), id],
    )?;
    conn.execute("UPDATE notes SET event_id = NULL WHERE event_id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::notes::{self, NoteInput, NoteStatus};
    use crate::Db;

    #[test]
    fn removing_an_event_unlinks_its_notes() {
        let db = Db::open_in_memory().unwrap();
        db.with_tx(|c| {
            let event = create(
                c,
                &input("Rapat", "2026-11-20T09:00:00Z", "2026-11-20T10:00:00Z"),
            )?;
            let note = notes::create(
                c,
                &NoteInput {
                    title: "Notulen".into(),
                    body_md: String::new(),
                    event_id: Some(event.id.clone()),
                    project_id: None,
                    pinned: false,
                    note_date: "2026-11-20".into(),
                    status: NoteStatus::Draft,
                    label_ids: vec![],
                },
            )?;
            assert_eq!(notes::get(c, &note.id)?.event_id, Some(event.id.clone()));

            remove(c, &event.id)?;
            // The note stays; only its link to the removed event is gone.
            assert_eq!(notes::get(c, &note.id)?.event_id, None);
            Ok(())
        })
        .unwrap();
    }

    fn input(title: &str, start: &str, end: &str) -> EventInput {
        EventInput {
            title: title.into(),
            description: None,
            location: Some("  ".into()),
            start_at: start.into(),
            end_at: end.into(),
            all_day: false,
            color: None,
        }
    }

    #[test]
    fn crud_and_range() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let a = create(
                c,
                &input("A", "2026-11-20T09:00:00Z", "2026-11-20T10:00:00Z"),
            )?;
            create(
                c,
                &input("B", "2026-12-01T09:00:00Z", "2026-12-01T10:00:00Z"),
            )?;
            assert_eq!(a.location, None);

            let november = EventRange {
                from: "2026-11-01T00:00:00Z".into(),
                to: "2026-12-01T00:00:00Z".into(),
            };
            assert_eq!(list(c, &november)?.len(), 1);

            let renamed = update(
                c,
                &a.id,
                &input("A2", "2026-11-20T09:00:00Z", "2026-11-20T11:00:00Z"),
            )?;
            assert_eq!(renamed.title, "A2");

            remove(c, &a.id)?;
            assert!(matches!(get(c, &a.id), Err(AppError::NotFound(_))));
            assert!(list(c, &november)?.is_empty());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn rejects_bad_input() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            assert!(create(
                c,
                &input(" ", "2026-11-20T09:00:00Z", "2026-11-20T10:00:00Z")
            )
            .is_err());
            assert!(create(
                c,
                &input("A", "2026-11-20T09:00:00Z", "2026-11-20T08:00:00Z")
            )
            .is_err());
            Ok(())
        })
        .unwrap();
    }
}

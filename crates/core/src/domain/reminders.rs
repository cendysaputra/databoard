use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::{AppError, Result};
use crate::util::{new_id, normalize_ts, now, optional, required, soft_delete};

const TABLE: &str = "reminders";
const COLUMNS: &str = "id, event_id, note_id, remind_at, message, done_at, created_at, updated_at";

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct Reminder {
    pub id: String,
    pub event_id: Option<String>,
    pub note_id: Option<String>,
    pub remind_at: String,
    pub message: String,
    pub done_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct ReminderInput {
    pub event_id: Option<String>,
    pub note_id: Option<String>,
    pub remind_at: String,
    pub message: String,
}

fn from_row(row: &Row<'_>) -> rusqlite::Result<Reminder> {
    Ok(Reminder {
        id: row.get(0)?,
        event_id: row.get(1)?,
        note_id: row.get(2)?,
        remind_at: row.get(3)?,
        message: row.get(4)?,
        done_at: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

/// Reminders by time. With `upcoming_only`, completed ones are left out.
pub fn list(conn: &Connection, upcoming_only: bool) -> Result<Vec<Reminder>> {
    let sql = format!(
        "SELECT {COLUMNS} FROM {TABLE}
         WHERE deleted_at IS NULL AND (?1 = 0 OR done_at IS NULL)
         ORDER BY remind_at"
    );
    let mut stmt = conn.prepare_cached(&sql)?;
    let rows = stmt.query_map([upcoming_only], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn get(conn: &Connection, id: &str) -> Result<Reminder> {
    let sql = format!("SELECT {COLUMNS} FROM {TABLE} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, [id], from_row)
        .optional()?
        .ok_or(AppError::NotFound("reminder"))
}

pub fn create(conn: &Connection, input: &ReminderInput) -> Result<Reminder> {
    let (id, now) = (new_id(), now());
    conn.execute(
        "INSERT INTO reminders (id, event_id, note_id, remind_at, message, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id,
            optional(input.event_id.as_deref()),
            optional(input.note_id.as_deref()),
            normalize_ts("remind_at", &input.remind_at)?,
            required("message", &input.message)?,
            now
        ],
    )?;
    get(conn, &id)
}

/// Marks a reminder as done. Completing it twice keeps the first completion time.
pub fn complete(conn: &Connection, id: &str) -> Result<Reminder> {
    conn.execute(
        "UPDATE reminders SET done_at = coalesce(done_at, ?2), updated_at = ?2
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id, now()],
    )?;
    get(conn, id)
}

pub fn remove(conn: &Connection, id: &str) -> Result<()> {
    soft_delete(conn, TABLE, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Db;

    #[test]
    fn create_complete_and_filter() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let input = ReminderInput {
                event_id: None,
                note_id: None,
                remind_at: "2026-11-20T09:00:00+07:00".into(),
                message: "Standup".into(),
            };
            let reminder = create(c, &input)?;
            assert_eq!(reminder.remind_at, "2026-11-20T02:00:00.000Z");

            assert!(complete(c, &reminder.id)?.done_at.is_some());
            assert!(list(c, true)?.is_empty());
            assert_eq!(list(c, false)?.len(), 1);

            remove(c, &reminder.id)?;
            assert!(list(c, false)?.is_empty());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn rejects_unknown_event() {
        let db = Db::open_in_memory().unwrap();
        let input = ReminderInput {
            event_id: Some("missing".into()),
            note_id: None,
            remind_at: "2026-11-20T09:00:00Z".into(),
            message: "x".into(),
        };
        assert!(db.with(|c| create(c, &input)).is_err());
    }
}

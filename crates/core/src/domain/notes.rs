use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::Page;
use crate::error::{AppError, Result};
use crate::util::{new_id, now, optional, required, soft_delete};

const TABLE: &str = "notes";
const COLUMNS: &str = "id, title, body_md, event_id, project_id, pinned, created_at, updated_at";

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub body_md: String,
    pub event_id: Option<String>,
    pub project_id: Option<String>,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct NoteInput {
    pub title: String,
    pub body_md: String,
    pub event_id: Option<String>,
    pub project_id: Option<String>,
    pub pinned: bool,
}

fn from_row(row: &Row<'_>) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        body_md: row.get(2)?,
        event_id: row.get(3)?,
        project_id: row.get(4)?,
        pinned: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

/// Pinned notes first, then most recently edited.
pub fn list(conn: &Connection, page: Page) -> Result<Vec<Note>> {
    let sql = format!(
        "SELECT {COLUMNS} FROM {TABLE} WHERE deleted_at IS NULL
         ORDER BY pinned DESC, updated_at DESC LIMIT ?1 OFFSET ?2"
    );
    let mut stmt = conn.prepare_cached(&sql)?;
    let rows = stmt.query_map(params![page.limit(), page.offset], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn get(conn: &Connection, id: &str) -> Result<Note> {
    let sql = format!("SELECT {COLUMNS} FROM {TABLE} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, [id], from_row)
        .optional()?
        .ok_or(AppError::NotFound("note"))
}

pub fn create(conn: &Connection, input: &NoteInput) -> Result<Note> {
    let (id, now) = (new_id(), now());
    conn.execute(
        "INSERT INTO notes (id, title, body_md, event_id, project_id, pinned, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            id,
            required("title", &input.title)?,
            input.body_md,
            optional(input.event_id.as_deref()),
            optional(input.project_id.as_deref()),
            input.pinned,
            now
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &NoteInput) -> Result<Note> {
    let changed = conn.execute(
        "UPDATE notes
         SET title = ?2, body_md = ?3, event_id = ?4, project_id = ?5, pinned = ?6, updated_at = ?7
         WHERE id = ?1 AND deleted_at IS NULL",
        params![
            id,
            required("title", &input.title)?,
            input.body_md,
            optional(input.event_id.as_deref()),
            optional(input.project_id.as_deref()),
            input.pinned,
            now()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("note"));
    }
    get(conn, id)
}

pub fn remove(conn: &Connection, id: &str) -> Result<()> {
    soft_delete(conn, TABLE, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Db;

    fn input(title: &str, body: &str, pinned: bool) -> NoteInput {
        NoteInput {
            title: title.into(),
            body_md: body.into(),
            event_id: None,
            project_id: None,
            pinned,
        }
    }

    fn fts_hits(conn: &Connection, query: &str) -> i64 {
        conn.query_row(
            "SELECT count(*) FROM notes_fts WHERE notes_fts MATCH ?1",
            [query],
            |r| r.get(0),
        )
        .unwrap()
    }

    #[test]
    fn crud_keeps_search_index_in_sync() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let note = create(c, &input("Kickoff", "bahas anggaran", false))?;
            create(c, &input("Pinned", "", true))?;
            assert_eq!(fts_hits(c, "anggaran"), 1);

            let all = list(
                c,
                Page {
                    limit: 10,
                    offset: 0,
                },
            )?;
            assert_eq!(all[0].title, "Pinned");
            assert_eq!(
                list(
                    c,
                    Page {
                        limit: 1,
                        offset: 1
                    }
                )?
                .len(),
                1
            );

            update(c, &note.id, &input("Kickoff", "bahas jadwal", false))?;
            assert_eq!(fts_hits(c, "anggaran"), 0);
            assert_eq!(fts_hits(c, "jadwal"), 1);

            remove(c, &note.id)?;
            assert_eq!(fts_hits(c, "jadwal"), 0);
            Ok(())
        })
        .unwrap();
    }
}

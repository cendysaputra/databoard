use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::{tags, Page};
use crate::error::{AppError, Result};
use crate::util::{iso_date, new_id, now, optional, required, soft_delete};

const TABLE: &str = "notes";
const ENTITY: &str = "note";

/// Subquery for the label ids of the note in the current row, as a JSON array.
macro_rules! label_ids {
    () => {
        "(SELECT json_group_array(t.tag_id) FROM taggables t
           JOIN tags g ON g.id = t.tag_id AND g.deleted_at IS NULL
          WHERE t.entity_type = 'note' AND t.entity_id = notes.id AND t.deleted_at IS NULL)"
    };
}

/// Columns of a note, plus its label ids as a JSON array.
const COLUMNS: &str = concat!(
    "id, title, body_md, event_id, project_id, pinned, note_date, status, ",
    label_ids!(),
    ", created_at, updated_at"
);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum NoteStatus {
    Draft,
    Published,
}

impl NoteStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
        }
    }

    fn parse(value: &str) -> Self {
        match value {
            "published" => Self::Published,
            _ => Self::Draft,
        }
    }
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct Note {
    pub id: String,
    pub title: String,
    /// The body as markdown.
    pub body_md: String,
    pub event_id: Option<String>,
    pub project_id: Option<String>,
    pub pinned: bool,
    /// The day the note is about, as `YYYY-MM-DD`.
    pub note_date: String,
    pub status: NoteStatus,
    pub label_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// A note as shown in lists: everything but the body, which is replaced by a short excerpt.
/// Lists stay small this way, however long the notes are.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct NoteSummary {
    pub id: String,
    pub title: String,
    /// The first line of text from the body, without markdown markers.
    pub excerpt: String,
    pub pinned: bool,
    pub note_date: String,
    pub status: NoteStatus,
    pub label_ids: Vec<String>,
    pub updated_at: String,
}

/// How much of the body is read to build an excerpt, and how long the excerpt may be.
const EXCERPT_SOURCE_CHARS: u32 = 600;
const EXCERPT_CHARS: usize = 160;

/// The first line that is not a heading, with list, quote and emphasis markers removed.
fn excerpt(body_start: &str) -> String {
    let line = body_start
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.starts_with('#'))
        .unwrap_or_default();
    let line = line.trim_start_matches(|c: char| {
        matches!(c, '-' | '*' | '>' | '[' | ']' | ' ') || c.eq_ignore_ascii_case(&'x')
    });
    line.chars()
        .filter(|c| !matches!(c, '*' | '_' | '`' | '~'))
        .take(EXCERPT_CHARS)
        .collect()
}

fn summary_from_row(row: &Row<'_>) -> rusqlite::Result<NoteSummary> {
    let body_start: String = row.get(2)?;
    let note_date: Option<String> = row.get(4)?;
    let status: String = row.get(5)?;
    let label_ids: String = row.get(6)?;
    let created_at: String = row.get(7)?;
    Ok(NoteSummary {
        id: row.get(0)?,
        title: row.get(1)?,
        excerpt: excerpt(&body_start),
        pinned: row.get(3)?,
        note_date: note_date.unwrap_or_else(|| created_at.chars().take(10).collect()),
        status: NoteStatus::parse(&status),
        label_ids: serde_json::from_str(&label_ids).unwrap_or_default(),
        updated_at: row.get(8)?,
    })
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct NoteInput {
    pub title: String,
    pub body_md: String,
    pub event_id: Option<String>,
    pub project_id: Option<String>,
    pub pinned: bool,
    pub note_date: String,
    pub status: NoteStatus,
    pub label_ids: Vec<String>,
}

fn from_row(row: &Row<'_>) -> rusqlite::Result<Note> {
    let note_date: Option<String> = row.get(6)?;
    let status: String = row.get(7)?;
    let label_ids: String = row.get(8)?;
    let created_at: String = row.get(9)?;
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        body_md: row.get(2)?,
        event_id: row.get(3)?,
        project_id: row.get(4)?,
        pinned: row.get(5)?,
        // Notes written before the date existed fall back to their creation day.
        note_date: note_date.unwrap_or_else(|| created_at.chars().take(10).collect()),
        status: NoteStatus::parse(&status),
        label_ids: serde_json::from_str(&label_ids).unwrap_or_default(),
        created_at,
        updated_at: row.get(10)?,
    })
}

/// Note summaries that pass `filter` (SQL on `notes`, with `value` bound as `?3`): pinned
/// first, then newest date. Only the start of each body is read from the database.
fn summaries(
    conn: &Connection,
    filter: &str,
    value: Option<&str>,
    page: Page,
) -> Result<Vec<NoteSummary>> {
    let sql = format!(
        "SELECT id, title, substr(body_md, 1, ?4), pinned, note_date, status, {label_ids},
            created_at, updated_at
         FROM notes
         WHERE deleted_at IS NULL AND {filter}
         ORDER BY pinned DESC, note_date DESC, updated_at DESC LIMIT ?1 OFFSET ?2",
        label_ids = label_ids!(),
    );
    let mut stmt = conn.prepare_cached(&sql)?;
    let rows = stmt.query_map(
        params![page.limit(), page.offset, value, EXCERPT_SOURCE_CHARS],
        summary_from_row,
    )?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

/// All notes, or with `label_id` only the notes carrying that label.
pub fn list(conn: &Connection, page: Page, label_id: Option<&str>) -> Result<Vec<NoteSummary>> {
    let filter = "(?3 IS NULL OR id IN (SELECT entity_id FROM taggables
                                        WHERE tag_id = ?3 AND entity_type = 'note'
                                          AND deleted_at IS NULL))";
    summaries(conn, filter, label_id, page)
}

/// Turns what the user typed into an FTS5 query: every word must appear, the last letters
/// of each may still be missing ("angg" finds "anggaran"). `None` when there is no word.
fn fts_query(text: &str) -> Option<String> {
    let words: Vec<String> = text
        .split(|c: char| !c.is_alphanumeric())
        .filter(|word| !word.is_empty())
        .map(|word| format!("\"{word}\"*"))
        .collect();
    (!words.is_empty()).then(|| words.join(" "))
}

/// Notes whose title or body contain every word of `text`, in the same order as [`list`].
/// Searching for nothing finds nothing.
pub fn search(conn: &Connection, text: &str, page: Page) -> Result<Vec<NoteSummary>> {
    let Some(query) = fts_query(text) else {
        return Ok(Vec::new());
    };
    let filter = "id IN (SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?3)";
    summaries(conn, filter, Some(&query), page)
}

pub fn get(conn: &Connection, id: &str) -> Result<Note> {
    let sql = format!("SELECT {COLUMNS} FROM {TABLE} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, [id], from_row)
        .optional()?
        .ok_or(AppError::NotFound("note"))
}

/// Creates a note and attaches its labels. Call inside a transaction.
pub fn create(conn: &Connection, input: &NoteInput) -> Result<Note> {
    let (id, now) = (new_id(), now());
    conn.execute(
        "INSERT INTO notes
           (id, title, body_md, event_id, project_id, pinned, note_date, status,
            created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        params![
            id,
            required("title", &input.title)?,
            input.body_md,
            optional(input.event_id.as_deref()),
            optional(input.project_id.as_deref()),
            input.pinned,
            iso_date("note_date", &input.note_date)?,
            input.status.as_str(),
            now
        ],
    )?;
    tags::set_for(conn, ENTITY, &id, &input.label_ids)?;
    get(conn, &id)
}

/// Replaces a note's fields and labels. Call inside a transaction.
pub fn update(conn: &Connection, id: &str, input: &NoteInput) -> Result<Note> {
    let changed = conn.execute(
        "UPDATE notes
         SET title = ?2, body_md = ?3, event_id = ?4, project_id = ?5, pinned = ?6,
             note_date = ?7, status = ?8, updated_at = ?9
         WHERE id = ?1 AND deleted_at IS NULL",
        params![
            id,
            required("title", &input.title)?,
            input.body_md,
            optional(input.event_id.as_deref()),
            optional(input.project_id.as_deref()),
            input.pinned,
            iso_date("note_date", &input.note_date)?,
            input.status.as_str(),
            now()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("note"));
    }
    tags::set_for(conn, ENTITY, id, &input.label_ids)?;
    get(conn, id)
}

pub fn remove(conn: &Connection, id: &str) -> Result<()> {
    soft_delete(conn, TABLE, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tags::TagInput;
    use crate::Db;

    const ALL: Page = Page {
        limit: 10,
        offset: 0,
    };

    fn input(title: &str, body: &str, pinned: bool) -> NoteInput {
        NoteInput {
            title: title.into(),
            body_md: body.into(),
            event_id: None,
            project_id: None,
            pinned,
            note_date: "2026-11-14".into(),
            status: NoteStatus::Draft,
            label_ids: vec![],
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
            let note = create(
                c,
                &input("Kickoff", "## Agenda\n\n- [ ] **bahas** anggaran", false),
            )?;
            create(c, &input("Pinned", "", true))?;
            assert_eq!(fts_hits(c, "anggaran"), 1);

            let all = list(c, ALL, None)?;
            assert_eq!(all[0].title, "Pinned");
            assert_eq!(
                all[1].excerpt, "bahas anggaran",
                "heading and markers are dropped"
            );
            assert_eq!(
                list(
                    c,
                    Page {
                        limit: 1,
                        offset: 1
                    },
                    None
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

    #[test]
    fn search_matches_all_words_by_prefix() {
        let db = Db::open_in_memory().unwrap();
        db.with_tx(|c| {
            create(c, &input("Rapat anggaran", "Bahas jadwal rilis", false))?;
            create(c, &input("Ide konten", "Studi kasus portfolio", false))?;
            let page = Page {
                limit: 50,
                offset: 0,
            };
            let titles = |text: &str| -> Result<Vec<String>> {
                Ok(search(c, text, page)?
                    .into_iter()
                    .map(|n| n.title)
                    .collect())
            };

            assert_eq!(titles("angg")?, ["Rapat anggaran"]);
            assert_eq!(titles("rilis RAPAT")?, ["Rapat anggaran"]);
            assert!(titles("anggaran portfolio")?.is_empty());
            // Punctuation is not FTS syntax here, and an empty search finds nothing.
            assert_eq!(titles("\"studi* (kasus")?, ["Ide konten"]);
            assert!(titles("  ")?.is_empty());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn date_status_and_labels() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let meeting = tags::create(
                c,
                &TagInput {
                    name: "Meeting".into(),
                    color: None,
                },
            )?;
            let idea = tags::create(
                c,
                &TagInput {
                    name: "Ide".into(),
                    color: None,
                },
            )?;

            let mut first = input("Rapat", "", false);
            first.label_ids = vec![meeting.id.clone(), idea.id.clone(), "missing".into()];
            first.status = NoteStatus::Published;
            let note = create(c, &first)?;
            assert_eq!(note.label_ids.len(), 2, "unknown label ids are ignored");
            assert_eq!(
                (note.status, note.note_date.as_str()),
                (NoteStatus::Published, "2026-11-14")
            );
            create(c, &input("Lain", "", false))?;

            assert_eq!(list(c, ALL, Some(&meeting.id))?.len(), 1);
            assert_eq!(list(c, ALL, None)?.len(), 2);

            // Dropping a label from the note, then putting it back.
            first.label_ids = vec![idea.id.clone()];
            assert_eq!(update(c, &note.id, &first)?.label_ids, [idea.id.as_str()]);
            first.label_ids = vec![meeting.id.clone()];
            assert_eq!(
                update(c, &note.id, &first)?.label_ids,
                [meeting.id.as_str()]
            );

            // Deleting the label detaches it.
            tags::remove(c, &meeting.id)?;
            assert!(get(c, &note.id)?.label_ids.is_empty());
            assert!(list(c, ALL, Some(&meeting.id))?.is_empty());

            let mut bad = input("Salah", "", false);
            bad.note_date = "14/11/2026".into();
            assert!(create(c, &bad).is_err());
            Ok(())
        })
        .unwrap();
    }
}

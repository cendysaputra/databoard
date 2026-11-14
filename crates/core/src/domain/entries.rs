//! Entries: the items of a collection. Their field values are validated against the
//! collection's blueprint before they are stored.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use time::macros::format_description;
use time::Date;
use ts_rs::TS;

use super::collections::{self, FieldDef, FieldType};
use super::Page;
use crate::error::{AppError, Result};
use crate::util::{new_id, now, required, soft_delete};

const TABLE: &str = "entries";
const COLUMNS: &str = "id, collection_id, title, status, data, created_at, updated_at";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum EntryStatus {
    Draft,
    Published,
}

impl EntryStatus {
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
pub struct Entry {
    pub id: String,
    pub collection_id: String,
    pub title: String,
    pub status: EntryStatus,
    /// Field values keyed by the blueprint's field keys.
    #[ts(type = "Record<string, string | number | boolean>")]
    pub data: Map<String, Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct EntryInput {
    pub title: String,
    pub status: EntryStatus,
    #[ts(type = "Record<string, string | number | boolean | null>")]
    pub data: Map<String, Value>,
}

fn is_iso_date(value: &str) -> bool {
    Date::parse(value, format_description!("[year]-[month]-[day]")).is_ok()
}

/// Checks one value against its field. `Ok(None)` means "empty, store nothing".
fn clean_value(field: &FieldDef, value: Option<&Value>) -> Result<Option<Value>> {
    let label = &field.label;
    let wrong = |expected: &str| AppError::validation(format!("{label} must be {expected}"));

    let value = match value {
        None | Some(Value::Null) => None,
        Some(Value::String(text)) if text.trim().is_empty() => None,
        Some(other) => Some(other),
    };
    let Some(value) = value else {
        return match (field.field_type, field.required) {
            (FieldType::Toggle, _) => Ok(Some(Value::Bool(false))),
            (_, true) => Err(AppError::validation(format!("{label} is required"))),
            (_, false) => Ok(None),
        };
    };

    match field.field_type {
        FieldType::Toggle => value
            .as_bool()
            .map(Value::Bool)
            .ok_or_else(|| wrong("on or off")),
        FieldType::Number => value
            .as_f64()
            .filter(|n| n.is_finite())
            .map(|_| value.clone())
            .ok_or_else(|| wrong("a number")),
        text_type => {
            let text = value.as_str().ok_or_else(|| wrong("text"))?;
            // Long-form fields keep their whitespace; one-line fields are trimmed.
            let text = match text_type {
                FieldType::Textarea | FieldType::Markdown => text,
                _ => text.trim(),
            };
            match text_type {
                FieldType::Date if !is_iso_date(text) => return Err(wrong("a date (YYYY-MM-DD)")),
                FieldType::Url
                    if !(text.starts_with("https://") || text.starts_with("http://")) =>
                {
                    return Err(wrong("a link starting with http:// or https://"))
                }
                FieldType::Select if !field.options.iter().any(|option| option == text) => {
                    return Err(wrong("one of the options"))
                }
                _ => {}
            }
            Ok(Value::String(text.to_owned()))
        }
    }
    .map(Some)
}

/// Keeps only the blueprint's fields, each validated. Unknown keys are dropped.
fn clean_data(fields: &[FieldDef], data: &Map<String, Value>) -> Result<Map<String, Value>> {
    let mut cleaned = Map::new();
    for field in fields {
        if let Some(value) = clean_value(field, data.get(&field.key))? {
            cleaned.insert(field.key.clone(), value);
        }
    }
    Ok(cleaned)
}

fn from_row(row: &Row<'_>) -> rusqlite::Result<Entry> {
    let status: String = row.get(3)?;
    let data: String = row.get(4)?;
    Ok(Entry {
        id: row.get(0)?,
        collection_id: row.get(1)?,
        title: row.get(2)?,
        status: EntryStatus::parse(&status),
        data: serde_json::from_str(&data).unwrap_or_default(),
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

/// Entries of one collection, most recently edited first.
pub fn list(conn: &Connection, collection_id: &str, page: Page) -> Result<Vec<Entry>> {
    let sql = format!(
        "SELECT {COLUMNS} FROM {TABLE}
         WHERE collection_id = ?1 AND deleted_at IS NULL
         ORDER BY updated_at DESC LIMIT ?2 OFFSET ?3"
    );
    let mut stmt = conn.prepare_cached(&sql)?;
    let rows = stmt.query_map(params![collection_id, page.limit(), page.offset], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn get(conn: &Connection, id: &str) -> Result<Entry> {
    let sql = format!("SELECT {COLUMNS} FROM {TABLE} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, [id], from_row)
        .optional()?
        .ok_or(AppError::NotFound("entry"))
}

pub fn create(conn: &Connection, collection_id: &str, input: &EntryInput) -> Result<Entry> {
    let collection = collections::get(conn, collection_id)?;
    let title = required("title", &input.title)?;
    let data = clean_data(&collection.fields, &input.data)?;
    let (id, now) = (new_id(), now());
    conn.execute(
        "INSERT INTO entries (id, collection_id, title, status, data, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id,
            collection.id,
            title,
            input.status.as_str(),
            Value::Object(data).to_string(),
            now
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &EntryInput) -> Result<Entry> {
    let current = get(conn, id)?;
    let collection = collections::get(conn, &current.collection_id)?;
    let title = required("title", &input.title)?;
    let data = clean_data(&collection.fields, &input.data)?;
    conn.execute(
        "UPDATE entries SET title = ?2, status = ?3, data = ?4, updated_at = ?5 WHERE id = ?1",
        params![
            id,
            title,
            input.status.as_str(),
            Value::Object(data).to_string(),
            now()
        ],
    )?;
    get(conn, id)
}

pub fn remove(conn: &Connection, id: &str) -> Result<()> {
    soft_delete(conn, TABLE, id)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::domain::collections::tests::{field, input as collection_input};
    use crate::Db;

    fn entry(title: &str, data: Value) -> EntryInput {
        let Value::Object(data) = data else {
            panic!("data must be an object")
        };
        EntryInput {
            title: title.into(),
            status: EntryStatus::Draft,
            data,
        }
    }

    #[test]
    fn validates_against_the_blueprint() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let posts = collections::create(
                c,
                &collection_input(
                    "Posts",
                    vec![
                        field("body", FieldType::Markdown, true),
                        field("category", FieldType::Select, false),
                        field("date", FieldType::Date, false),
                        field("views", FieldType::Number, false),
                        field("featured", FieldType::Toggle, false),
                        field("link", FieldType::Url, false),
                    ],
                ),
            )?;

            let good = json!({
                "body": "Halo\n", "category": "Tips", "date": "2026-11-14",
                "views": 12, "link": " https://example.com ", "unknown": "dropped"
            });
            let saved = create(c, &posts.id, &entry("Pertama", good))?;
            assert_eq!(saved.data["body"], "Halo\n");
            assert_eq!(saved.data["link"], "https://example.com");
            assert_eq!(saved.data["featured"], false);
            assert!(!saved.data.contains_key("unknown"));
            assert_eq!(collections::get(c, &posts.id)?.entry_count, 1);

            for bad in [
                json!({}),
                json!({ "body": "x", "category": "Lainnya" }),
                json!({ "body": "x", "date": "14/11/2026" }),
                json!({ "body": "x", "views": "banyak" }),
                json!({ "body": "x", "featured": "ya" }),
                json!({ "body": "x", "link": "example.com" }),
            ] {
                assert!(
                    create(c, &posts.id, &entry("Salah", bad.clone())).is_err(),
                    "{bad}"
                );
            }
            assert!(create(c, &posts.id, &entry(" ", json!({ "body": "x" }))).is_err());
            assert!(create(c, "missing", &entry("X", json!({}))).is_err());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn update_list_and_remove() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let notes = collections::create(c, &collection_input("Links", vec![]))?;
            let first = create(c, &notes.id, &entry("A", json!({})))?;
            create(c, &notes.id, &entry("B", json!({})))?;

            let mut changed = entry("A2", json!({}));
            changed.status = EntryStatus::Published;
            let updated = update(c, &first.id, &changed)?;
            assert_eq!(
                (updated.title.as_str(), updated.status),
                ("A2", EntryStatus::Published)
            );

            assert_eq!(
                list(
                    c,
                    &notes.id,
                    Page {
                        limit: 10,
                        offset: 0
                    }
                )?
                .len(),
                2
            );
            remove(c, &first.id)?;
            assert_eq!(
                list(
                    c,
                    &notes.id,
                    Page {
                        limit: 10,
                        offset: 0
                    }
                )?
                .len(),
                1
            );

            collections::remove(c, &notes.id)?;
            assert!(list(
                c,
                &notes.id,
                Page {
                    limit: 10,
                    offset: 0
                }
            )?
            .is_empty());
            Ok(())
        })
        .unwrap();
    }
}

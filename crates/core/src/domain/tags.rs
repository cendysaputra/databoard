//! Labels (stored as tags). A label has a unique name and can be attached to notes.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::{AppError, Result};
use crate::util::{new_id, now, optional, required};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct TagInput {
    pub name: String,
    pub color: Option<String>,
}

fn from_row(row: &Row<'_>) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
    })
}

/// Id of the tag with this name (compared without case), deleted or not.
fn find_by_name(conn: &Connection, name: &str) -> Result<Option<(String, bool)>> {
    Ok(conn
        .query_row(
            "SELECT id, deleted_at IS NOT NULL FROM tags WHERE name = ?1 COLLATE NOCASE",
            [name],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?)
}

pub fn list(conn: &Connection) -> Result<Vec<Tag>> {
    let mut stmt = conn.prepare_cached(
        "SELECT id, name, color FROM tags WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn get(conn: &Connection, id: &str) -> Result<Tag> {
    conn.query_row(
        "SELECT id, name, color FROM tags WHERE id = ?1 AND deleted_at IS NULL",
        [id],
        from_row,
    )
    .optional()?
    .ok_or(AppError::NotFound("label"))
}

/// Creates a label. A label deleted earlier with the same name is brought back instead,
/// because names stay unique across deleted rows.
pub fn create(conn: &Connection, input: &TagInput) -> Result<Tag> {
    let name = required("name", &input.name)?;
    let color = optional(input.color.as_deref());
    let now = now();
    let id = match find_by_name(conn, &name)? {
        Some((_, false)) => {
            return Err(AppError::validation(format!(
                "label \"{name}\" already exists"
            )))
        }
        Some((id, true)) => {
            conn.execute(
                "UPDATE tags SET name = ?2, color = ?3, deleted_at = NULL, updated_at = ?4
                 WHERE id = ?1",
                params![id, name, color, now],
            )?;
            id
        }
        None => {
            let id = new_id();
            conn.execute(
                "INSERT INTO tags (id, name, color, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?4)",
                params![id, name, color, now],
            )?;
            id
        }
    };
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &TagInput) -> Result<Tag> {
    let name = required("name", &input.name)?;
    if find_by_name(conn, &name)?.is_some_and(|(other, _)| other != id) {
        return Err(AppError::validation(format!(
            "label \"{name}\" already exists"
        )));
    }
    let changed = conn.execute(
        "UPDATE tags SET name = ?2, color = ?3, updated_at = ?4
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id, name, optional(input.color.as_deref()), now()],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("label"));
    }
    get(conn, id)
}

/// Soft-deletes the label and detaches it from everything it was on.
pub fn remove(conn: &Connection, id: &str) -> Result<()> {
    let now = now();
    let changed = conn.execute(
        "UPDATE tags SET deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND deleted_at IS NULL",
        params![id, now],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("label"));
    }
    conn.execute(
        "UPDATE taggables SET deleted_at = ?2, updated_at = ?2
         WHERE tag_id = ?1 AND deleted_at IS NULL",
        params![id, now],
    )?;
    Ok(())
}

/// Replaces the labels of one entity (`note` or `project`). Unknown label ids are ignored.
pub(crate) fn set_for(
    conn: &Connection,
    entity_type: &'static str,
    entity_id: &str,
    tag_ids: &[String],
) -> Result<()> {
    let now = now();
    conn.execute(
        "UPDATE taggables SET deleted_at = ?3, updated_at = ?3
         WHERE entity_type = ?1 AND entity_id = ?2 AND deleted_at IS NULL",
        params![entity_type, entity_id, now],
    )?;
    let mut stmt = conn.prepare_cached(
        "INSERT INTO taggables (tag_id, entity_type, entity_id, created_at, updated_at)
         SELECT id, ?2, ?3, ?4, ?4 FROM tags WHERE id = ?1 AND deleted_at IS NULL
         ON CONFLICT (tag_id, entity_type, entity_id)
         DO UPDATE SET deleted_at = NULL, updated_at = excluded.updated_at",
    )?;
    for tag_id in tag_ids {
        stmt.execute(params![tag_id, entity_type, entity_id, now])?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Db;

    fn input(name: &str) -> TagInput {
        TagInput {
            name: name.into(),
            color: None,
        }
    }

    #[test]
    fn crud_with_unique_names() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let meeting = create(c, &input(" Meeting "))?;
            assert_eq!(meeting.name, "Meeting");
            assert!(
                create(c, &input("meeting")).is_err(),
                "names are unique without case"
            );

            let idea = create(c, &input("Ide"))?;
            assert!(update(c, &idea.id, &input("Meeting")).is_err());
            assert_eq!(update(c, &idea.id, &input("Gagasan"))?.name, "Gagasan");
            assert_eq!(list(c)?.len(), 2);

            remove(c, &meeting.id)?;
            assert_eq!(list(c)?.len(), 1);
            let revived = create(c, &input("Meeting"))?;
            assert_eq!(revived.id, meeting.id, "a deleted label is brought back");
            Ok(())
        })
        .unwrap();
    }
}

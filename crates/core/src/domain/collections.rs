//! Collections: user-defined content types. Each one carries a blueprint, the list of
//! fields its entries are edited and validated with.

use std::collections::HashSet;

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::{AppError, Result};
use crate::util::{new_id, now, optional, required, slugify, soft_delete};

const TABLE: &str = "collections";
const MAX_FIELDS: usize = 50;
/// Keys the entry itself uses; a blueprint field must not shadow them.
const RESERVED_KEYS: [&str; 3] = ["id", "title", "status"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum FieldType {
    Text,
    Textarea,
    Markdown,
    Number,
    Date,
    Toggle,
    Select,
    Url,
}

/// One field of a blueprint.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct FieldDef {
    /// Name of the value inside an entry's `data`, e.g. `publish_date`.
    pub key: String,
    /// What the editor shows above the input.
    pub label: String,
    pub field_type: FieldType,
    pub required: bool,
    /// Choices of a `select` field; empty for other types.
    pub options: Vec<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub fields: Vec<FieldDef>,
    pub entry_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct CollectionInput {
    pub name: String,
    /// Left empty, the slug is derived from the name.
    pub slug: Option<String>,
    pub description: Option<String>,
    pub fields: Vec<FieldDef>,
}

fn is_valid_key(key: &str) -> bool {
    let mut chars = key.chars();
    chars.next().is_some_and(|c| c.is_ascii_lowercase())
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

/// Trims every field and checks keys, labels and select options.
fn clean_fields(fields: &[FieldDef]) -> Result<Vec<FieldDef>> {
    if fields.len() > MAX_FIELDS {
        return Err(AppError::validation("too many fields"));
    }
    let mut seen = HashSet::new();
    fields
        .iter()
        .map(|field| {
            let key = field.key.trim().to_owned();
            let label = required("field label", &field.label)?;
            if !is_valid_key(&key) {
                return Err(AppError::validation(format!(
                    "field key \"{key}\" must be lowercase letters, digits or _ and start with a letter"
                )));
            }
            if RESERVED_KEYS.contains(&key.as_str()) || !seen.insert(key.clone()) {
                return Err(AppError::validation(format!("field key \"{key}\" is already used")));
            }
            let options: Vec<String> = match field.field_type {
                FieldType::Select => field
                    .options
                    .iter()
                    .map(|option| option.trim().to_owned())
                    .filter(|option| !option.is_empty())
                    .collect(),
                _ => Vec::new(),
            };
            if field.field_type == FieldType::Select && options.is_empty() {
                return Err(AppError::validation(format!("{label} needs at least one option")));
            }
            Ok(FieldDef { key, label, field_type: field.field_type, required: field.required, options })
        })
        .collect()
}

/// Input after validation, ready to store.
struct Clean {
    name: String,
    slug: String,
    description: Option<String>,
    fields: String,
}

fn clean(conn: &Connection, input: &CollectionInput, own_id: Option<&str>) -> Result<Clean> {
    let name = required("name", &input.name)?;
    let slug = slugify(
        input
            .slug
            .as_deref()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or(&name),
    );
    if slug.is_empty() {
        return Err(AppError::validation(
            "slug needs at least one letter or digit",
        ));
    }
    let taken: bool = conn.query_row(
        "SELECT EXISTS (SELECT 1 FROM collections
                        WHERE slug = ?1 AND deleted_at IS NULL AND id IS NOT ?2)",
        params![slug, own_id],
        |row| row.get(0),
    )?;
    if taken {
        return Err(AppError::validation(format!(
            "slug \"{slug}\" is already used"
        )));
    }
    Ok(Clean {
        name,
        slug,
        description: optional(input.description.as_deref()),
        fields: serde_json::to_string(&clean_fields(&input.fields)?)?,
    })
}

const SELECT: &str = "SELECT c.id, c.name, c.slug, c.description, c.fields,
            (SELECT count(*) FROM entries e
             WHERE e.collection_id = c.id AND e.deleted_at IS NULL),
            c.created_at, c.updated_at
     FROM collections c WHERE c.deleted_at IS NULL";

fn from_row(row: &Row<'_>) -> rusqlite::Result<Collection> {
    let fields: String = row.get(4)?;
    Ok(Collection {
        id: row.get(0)?,
        name: row.get(1)?,
        slug: row.get(2)?,
        description: row.get(3)?,
        fields: serde_json::from_str(&fields).unwrap_or_default(),
        entry_count: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

/// All collections by name, each with its number of entries.
pub fn list(conn: &Connection) -> Result<Vec<Collection>> {
    let mut stmt = conn.prepare_cached(&format!("{SELECT} ORDER BY c.name COLLATE NOCASE"))?;
    let rows = stmt.query_map([], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn get(conn: &Connection, id: &str) -> Result<Collection> {
    conn.query_row(&format!("{SELECT} AND c.id = ?1"), [id], from_row)
        .optional()?
        .ok_or(AppError::NotFound("collection"))
}

pub fn create(conn: &Connection, input: &CollectionInput) -> Result<Collection> {
    let c = clean(conn, input, None)?;
    let (id, now) = (new_id(), now());
    conn.execute(
        "INSERT INTO collections (id, name, slug, description, fields, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![id, c.name, c.slug, c.description, c.fields, now],
    )?;
    get(conn, &id)
}

/// Replaces name, slug, description and blueprint. Existing entries keep their data;
/// values of removed fields simply stop being shown.
pub fn update(conn: &Connection, id: &str, input: &CollectionInput) -> Result<Collection> {
    let c = clean(conn, input, Some(id))?;
    let changed = conn.execute(
        "UPDATE collections
         SET name = ?2, slug = ?3, description = ?4, fields = ?5, updated_at = ?6
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id, c.name, c.slug, c.description, c.fields, now()],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("collection"));
    }
    get(conn, id)
}

/// Soft-deletes the collection together with its entries.
pub fn remove(conn: &Connection, id: &str) -> Result<()> {
    soft_delete(conn, TABLE, id)?;
    conn.execute(
        "UPDATE entries SET deleted_at = ?1, updated_at = ?1
         WHERE collection_id = ?2 AND deleted_at IS NULL",
        params![now(), id],
    )?;
    Ok(())
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::Db;

    pub fn field(key: &str, field_type: FieldType, required: bool) -> FieldDef {
        FieldDef {
            key: key.into(),
            label: key.to_uppercase(),
            field_type,
            required,
            options: if field_type == FieldType::Select {
                vec!["News".into(), " Tips ".into()]
            } else {
                vec![]
            },
        }
    }

    pub fn input(name: &str, fields: Vec<FieldDef>) -> CollectionInput {
        CollectionInput {
            name: name.into(),
            slug: None,
            description: None,
            fields,
        }
    }

    #[test]
    fn crud_and_slug_rules() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let posts = create(
                c,
                &input(
                    "Blog Posts",
                    vec![field("category", FieldType::Select, false)],
                ),
            )?;
            assert_eq!(posts.slug, "blog-posts");
            assert_eq!(posts.fields[0].options, ["News", "Tips"]);
            assert_eq!(posts.entry_count, 0);

            assert!(
                create(c, &input("Blog posts", vec![])).is_err(),
                "slug must be unique"
            );
            let renamed = update(c, &posts.id, &input("Posts", vec![]))?;
            assert_eq!((renamed.slug.as_str(), renamed.fields.len()), ("posts", 0));

            remove(c, &posts.id)?;
            assert!(list(c)?.is_empty());
            create(c, &input("Posts", vec![]))?; // the slug is free again
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn rejects_bad_blueprints() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let bad_key = field("Bad Key", FieldType::Text, false);
            let reserved = field("title", FieldType::Text, false);
            let twice = vec![
                field("a", FieldType::Text, false),
                field("a", FieldType::Number, false),
            ];
            let mut no_options = field("kind", FieldType::Select, false);
            no_options.options.clear();

            assert!(create(c, &input("A", vec![bad_key])).is_err());
            assert!(create(c, &input("B", vec![reserved])).is_err());
            assert!(create(c, &input("C", twice)).is_err());
            assert!(create(c, &input("D", vec![no_options])).is_err());
            assert!(create(c, &input("!!!", vec![])).is_err());
            Ok(())
        })
        .unwrap();
    }
}

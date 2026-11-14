use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ToSql, ToSqlOutput, ValueRef};
use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::{AppError, Result};
use crate::util::{new_id, now, optional, required, soft_delete};

const TABLE: &str = "projects";
const COLUMNS: &str = "id, title, client, year, role, stack, url, repo_url, description_md, \
                       cover_path, status, sort_order, created_at, updated_at";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum ProjectStatus {
    Draft,
    Published,
    Archived,
}

impl ProjectStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
            Self::Archived => "archived",
        }
    }
}

impl ToSql for ProjectStatus {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
        Ok(self.as_str().into())
    }
}

impl FromSql for ProjectStatus {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        match value.as_str()? {
            "draft" => Ok(Self::Draft),
            "published" => Ok(Self::Published),
            "archived" => Ok(Self::Archived),
            _ => Err(FromSqlError::InvalidType),
        }
    }
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub client: Option<String>,
    pub year: Option<i32>,
    pub role: Option<String>,
    pub stack: Vec<String>,
    pub url: Option<String>,
    pub repo_url: Option<String>,
    pub description_md: String,
    /// Path relative to the app's `media/` directory.
    pub cover_path: Option<String>,
    pub status: ProjectStatus,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct ProjectInput {
    pub title: String,
    pub client: Option<String>,
    pub year: Option<i32>,
    pub role: Option<String>,
    pub stack: Vec<String>,
    pub url: Option<String>,
    pub repo_url: Option<String>,
    pub description_md: String,
    pub cover_path: Option<String>,
    pub status: ProjectStatus,
    pub sort_order: i32,
}

fn from_row(row: &Row<'_>) -> rusqlite::Result<Project> {
    let stack: String = row.get(5)?;
    Ok(Project {
        id: row.get(0)?,
        title: row.get(1)?,
        client: row.get(2)?,
        year: row.get(3)?,
        role: row.get(4)?,
        stack: serde_json::from_str(&stack).unwrap_or_default(),
        url: row.get(6)?,
        repo_url: row.get(7)?,
        description_md: row.get(8)?,
        cover_path: row.get(9)?,
        status: row.get(10)?,
        sort_order: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

/// The stack as a JSON array of trimmed, non-empty names.
fn stack_json(stack: &[String]) -> Result<String> {
    let cleaned: Vec<&str> = stack
        .iter()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    Ok(serde_json::to_string(&cleaned)?)
}

fn check_year(year: Option<i32>) -> Result<()> {
    match year {
        Some(y) if !(1900..=2200).contains(&y) => Err(AppError::validation("year is out of range")),
        _ => Ok(()),
    }
}

/// All projects by manual order, optionally limited to one status.
pub fn list(conn: &Connection, status: Option<ProjectStatus>) -> Result<Vec<Project>> {
    let sql = format!(
        "SELECT {COLUMNS} FROM {TABLE}
         WHERE deleted_at IS NULL AND (?1 IS NULL OR status = ?1)
         ORDER BY sort_order, created_at DESC"
    );
    let mut stmt = conn.prepare_cached(&sql)?;
    let rows = stmt.query_map([status], from_row)?;
    Ok(rows.collect::<rusqlite::Result<_>>()?)
}

pub fn get(conn: &Connection, id: &str) -> Result<Project> {
    let sql = format!("SELECT {COLUMNS} FROM {TABLE} WHERE id = ?1 AND deleted_at IS NULL");
    conn.query_row(&sql, [id], from_row)
        .optional()?
        .ok_or(AppError::NotFound("project"))
}

pub fn create(conn: &Connection, input: &ProjectInput) -> Result<Project> {
    check_year(input.year)?;
    let (id, now) = (new_id(), now());
    conn.execute(
        "INSERT INTO projects
           (id, title, client, year, role, stack, url, repo_url, description_md, cover_path,
            status, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)",
        params![
            id,
            required("title", &input.title)?,
            optional(input.client.as_deref()),
            input.year,
            optional(input.role.as_deref()),
            stack_json(&input.stack)?,
            optional(input.url.as_deref()),
            optional(input.repo_url.as_deref()),
            input.description_md,
            optional(input.cover_path.as_deref()),
            input.status,
            input.sort_order,
            now
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &ProjectInput) -> Result<Project> {
    check_year(input.year)?;
    let changed = conn.execute(
        "UPDATE projects
         SET title = ?2, client = ?3, year = ?4, role = ?5, stack = ?6, url = ?7, repo_url = ?8,
             description_md = ?9, cover_path = ?10, status = ?11, sort_order = ?12, updated_at = ?13
         WHERE id = ?1 AND deleted_at IS NULL",
        params![
            id,
            required("title", &input.title)?,
            optional(input.client.as_deref()),
            input.year,
            optional(input.role.as_deref()),
            stack_json(&input.stack)?,
            optional(input.url.as_deref()),
            optional(input.repo_url.as_deref()),
            input.description_md,
            optional(input.cover_path.as_deref()),
            input.status,
            input.sort_order,
            now()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("project"));
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

    fn input(title: &str, status: ProjectStatus, sort_order: i32) -> ProjectInput {
        ProjectInput {
            title: title.into(),
            client: Some("Acme".into()),
            year: Some(2026),
            role: None,
            stack: vec!["Rust".into(), " ".into(), "React ".into()],
            url: None,
            repo_url: None,
            description_md: String::new(),
            cover_path: None,
            status,
            sort_order,
        }
    }

    #[test]
    fn crud_and_status_filter() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            let second = create(c, &input("Second", ProjectStatus::Draft, 2))?;
            create(c, &input("First", ProjectStatus::Published, 1))?;
            assert_eq!(second.stack, ["Rust", "React"]);

            let all = list(c, None)?;
            assert_eq!(all[0].title, "First");
            assert_eq!(list(c, Some(ProjectStatus::Draft))?.len(), 1);

            let archived = update(c, &second.id, &input("Second", ProjectStatus::Archived, 2))?;
            assert_eq!(archived.status, ProjectStatus::Archived);

            remove(c, &second.id)?;
            assert_eq!(list(c, None)?.len(), 1);

            let mut bad = input("Bad", ProjectStatus::Draft, 0);
            bad.year = Some(12);
            assert!(create(c, &bad).is_err());
            Ok(())
        })
        .unwrap();
    }
}

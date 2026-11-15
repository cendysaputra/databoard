//! Small helpers shared by the domain modules: ids, timestamps, input cleanup.

use rusqlite::{params, Connection};
use time::format_description::well_known::Rfc3339;
use time::macros::format_description;
use time::{Date, OffsetDateTime, UtcOffset};

use crate::error::{AppError, Result};

const MAX_TITLE_LEN: usize = 300;

pub fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}

/// Formats as fixed-width UTC (`2026-11-20T09:00:00.000Z`) so timestamps sort as plain text.
fn format_utc(at: OffsetDateTime) -> String {
    let format =
        format_description!("[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3]Z");
    at.to_offset(UtcOffset::UTC)
        .format(format)
        .unwrap_or_default()
}

pub fn now() -> String {
    format_utc(OffsetDateTime::now_utc())
}

/// Parses any RFC 3339 timestamp and returns it in the stored UTC format.
pub fn normalize_ts(field: &str, value: &str) -> Result<String> {
    OffsetDateTime::parse(value.trim(), &Rfc3339)
        .map(format_utc)
        .map_err(|_| AppError::validation(format!("{field} must be an RFC 3339 timestamp")))
}

/// Checks a calendar date written as `YYYY-MM-DD` and returns it trimmed.
pub fn iso_date(field: &str, value: &str) -> Result<String> {
    let value = value.trim();
    Date::parse(value, format_description!("[year]-[month]-[day]"))
        .map(|_| value.to_owned())
        .map_err(|_| AppError::validation(format!("{field} must be a date (YYYY-MM-DD)")))
}

/// Trims a required text field and rejects empty or oversized values.
pub fn required(field: &str, value: &str) -> Result<String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppError::validation(format!("{field} is required")));
    }
    if value.chars().count() > MAX_TITLE_LEN {
        return Err(AppError::validation(format!("{field} is too long")));
    }
    Ok(value.to_owned())
}

/// Trims an optional text field; blank becomes `None`.
pub fn optional(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(str::to_owned)
}

/// Soft-deletes one row. `table` is always a constant from this crate, never user input.
pub fn soft_delete(conn: &Connection, table: &'static str, id: &str) -> Result<()> {
    let now = now();
    let sql = format!(
        "UPDATE {table} SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL"
    );
    match conn.execute(&sql, params![now, id])? {
        0 => Err(AppError::NotFound(table)),
        _ => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_offsets_to_utc() {
        let ts = normalize_ts("start_at", "2026-11-20T09:00:00+07:00").unwrap();
        assert_eq!(ts, "2026-11-20T02:00:00.000Z");
        assert!(normalize_ts("start_at", "tomorrow").is_err());
    }

    #[test]
    fn cleans_text_input() {
        assert_eq!(required("title", "  Hi ").unwrap(), "Hi");
        assert!(required("title", "   ").is_err());
        assert_eq!(optional(Some("  ")), None);
        assert_eq!(optional(Some(" a ")), Some("a".to_owned()));
    }
}

//! Numbers for the home page, computed in one call so the frontend only draws them.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::events::{self, CalendarEvent};
use crate::error::{AppError, Result};
use crate::util::normalize_ts;

const MAX_BOUNDARIES: usize = 64;
const NEXT_EVENTS: u32 = 5;

/// The caller sends bucket boundaries in its own time zone, so "a day" and "a week"
/// mean local days and weeks. N+1 boundaries describe N buckets.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct OverviewQuery {
    pub now: String,
    pub day_starts: Vec<String>,
    pub week_starts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct Overview {
    /// Events starting in each day bucket.
    pub events_per_day: Vec<i32>,
    /// Notes created in each week bucket.
    pub notes_per_week: Vec<i32>,
    pub next_events: Vec<CalendarEvent>,
    /// Reminders that are not done yet.
    pub active_reminders: i32,
    pub notes_total: i32,
    pub projects_total: i32,
    pub projects_draft: i32,
    pub projects_published: i32,
    pub projects_archived: i32,
}

fn boundaries(field: &str, values: &[String]) -> Result<Vec<String>> {
    if values.len() > MAX_BOUNDARIES {
        return Err(AppError::validation(format!(
            "{field} has too many entries"
        )));
    }
    values
        .iter()
        .map(|value| normalize_ts(field, value))
        .collect()
}

/// Runs `sql` (two parameters: bucket start and end) once per bucket.
fn count_per_bucket(conn: &Connection, sql: &str, bounds: &[String]) -> Result<Vec<i32>> {
    let mut stmt = conn.prepare_cached(sql)?;
    bounds
        .windows(2)
        .map(|pair| Ok(stmt.query_row(params![pair[0], pair[1]], |row| row.get(0))?))
        .collect()
}

fn count(conn: &Connection, sql: &str) -> Result<i32> {
    Ok(conn.query_row(sql, [], |row| row.get(0))?)
}

pub fn get(conn: &Connection, query: &OverviewQuery) -> Result<Overview> {
    let days = boundaries("day_starts", &query.day_starts)?;
    let weeks = boundaries("week_starts", &query.week_starts)?;

    let (draft, published, archived) = conn.query_row(
        "SELECT coalesce(sum(status = 'draft'), 0), coalesce(sum(status = 'published'), 0),
                coalesce(sum(status = 'archived'), 0)
         FROM projects WHERE deleted_at IS NULL",
        [],
        |row| {
            Ok((
                row.get::<_, i32>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, i32>(2)?,
            ))
        },
    )?;

    Ok(Overview {
        events_per_day: count_per_bucket(
            conn,
            "SELECT count(*) FROM events
             WHERE deleted_at IS NULL AND start_at >= ?1 AND start_at < ?2",
            &days,
        )?,
        notes_per_week: count_per_bucket(
            conn,
            "SELECT count(*) FROM notes
             WHERE deleted_at IS NULL AND created_at >= ?1 AND created_at < ?2",
            &weeks,
        )?,
        next_events: events::upcoming(conn, &query.now, NEXT_EVENTS)?,
        active_reminders: count(
            conn,
            "SELECT count(*) FROM reminders WHERE deleted_at IS NULL AND done_at IS NULL",
        )?,
        notes_total: count(conn, "SELECT count(*) FROM notes WHERE deleted_at IS NULL")?,
        projects_total: draft + published + archived,
        projects_draft: draft,
        projects_published: published,
        projects_archived: archived,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::events::EventInput;
    use crate::domain::notes::{self, NoteInput};
    use crate::domain::projects::{self, ProjectInput, ProjectStatus};
    use crate::Db;

    fn event(start: &str, end: &str) -> EventInput {
        EventInput {
            title: "E".into(),
            description: None,
            location: None,
            start_at: start.into(),
            end_at: end.into(),
            all_day: false,
            color: None,
        }
    }

    #[test]
    fn counts_buckets_and_totals() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            events::create(c, &event("2026-11-14T09:00:00Z", "2026-11-14T10:00:00Z"))?;
            events::create(c, &event("2026-11-15T09:00:00Z", "2026-11-15T10:00:00Z"))?;
            events::create(c, &event("2026-11-15T13:00:00Z", "2026-11-15T14:00:00Z"))?;
            notes::create(
                c,
                &NoteInput {
                    title: "N".into(),
                    body_md: String::new(),
                    event_id: None,
                    project_id: None,
                    pinned: false,
                    note_date: "2026-11-14".into(),
                    status: notes::NoteStatus::Draft,
                    label_ids: vec![],
                },
            )?;
            projects::create(
                c,
                &ProjectInput {
                    title: "P".into(),
                    client: None,
                    year: None,
                    role: None,
                    kind: None,
                    stack: vec![],
                    url: None,
                    repo_url: None,
                    description_md: String::new(),
                    cover_path: None,
                    status: ProjectStatus::Published,
                    sort_order: 0,
                },
            )?;

            let query = OverviewQuery {
                now: "2026-11-14T12:00:00Z".into(),
                day_starts: vec![
                    "2026-11-14T00:00:00Z".into(),
                    "2026-11-15T00:00:00Z".into(),
                    "2026-11-16T00:00:00Z".into(),
                    "2026-11-17T00:00:00Z".into(),
                ],
                week_starts: vec!["2000-01-01T00:00:00Z".into(), "2100-01-01T00:00:00Z".into()],
            };
            let overview = get(c, &query)?;
            assert_eq!(overview.events_per_day, [1, 2, 0]);
            assert_eq!(overview.notes_per_week, [1]);
            assert_eq!(
                overview.next_events.len(),
                2,
                "the event that already ended is left out"
            );
            assert_eq!((overview.notes_total, overview.projects_total), (1, 1));
            assert_eq!(overview.projects_published, 1);

            let empty = OverviewQuery {
                day_starts: vec![],
                week_starts: vec![],
                ..query
            };
            assert!(get(c, &empty)?.events_per_day.is_empty());
            Ok(())
        })
        .unwrap();
    }
}

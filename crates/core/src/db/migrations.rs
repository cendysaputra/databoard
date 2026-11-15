use std::path::Path;

use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};
use time::macros::format_description;
use time::OffsetDateTime;

use super::backup::{backup_to, prune};
use crate::error::Result;

/// How many pre-migration backups are kept; older ones are deleted.
const BACKUPS_KEPT: usize = 5;

/// Numbered migrations, in order. Released files are never edited; append a new one instead.
const MIGRATIONS: &[&str] = &[
    include_str!("../../migrations/001_init.sql"),
    include_str!("../../migrations/002_collections.sql"),
    include_str!("../../migrations/003_note_fields.sql"),
    include_str!("../../migrations/004_project_kind.sql"),
    include_str!("../../migrations/005_reminder_notified.sql"),
];

/// Brings the schema to the latest version. If an existing database is behind, it is first
/// copied to `backup_dir/dashboard-<app_version>-<date>.db`.
pub fn run(conn: &mut Connection, backup_dir: Option<&Path>, app_version: &str) -> Result<()> {
    run_all(conn, MIGRATIONS, backup_dir, app_version)
}

fn run_all(
    conn: &mut Connection,
    migrations: &[&str],
    backup_dir: Option<&Path>,
    app_version: &str,
) -> Result<()> {
    let current: u32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    let current = current as usize;
    if let Some(dir) = backup_dir {
        if current > 0 && current < migrations.len() {
            backup_to(conn, &dir.join(backup_name(app_version)))?;
            // Old backups would otherwise pile up with every update.
            prune(dir, BACKUPS_KEPT)?;
        }
    }
    let steps = migrations.iter().map(|sql| M::up(sql)).collect();
    Migrations::new(steps).to_latest(conn)?;
    Ok(())
}

fn backup_name(app_version: &str) -> String {
    let format = format_description!("[year][month][day]-[hour][minute][second]");
    let stamp = OffsetDateTime::now_utc().format(format).unwrap_or_default();
    format!("dashboard-{app_version}-{stamp}.db")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_are_valid() {
        let steps = MIGRATIONS.iter().map(|sql| M::up(sql)).collect();
        Migrations::new(steps).validate().unwrap();
    }

    #[test]
    fn backs_up_before_pending_migration() {
        let dir = tempfile::tempdir().unwrap();
        let backups = dir.path().join("backups");
        let mut conn = Connection::open(dir.path().join("test.db")).unwrap();
        let first = "CREATE TABLE a (id TEXT PRIMARY KEY);";
        let second = "CREATE TABLE b (id TEXT PRIMARY KEY);";

        run_all(&mut conn, &[first], Some(&backups), "0.1.0").unwrap();
        assert!(!backups.exists(), "a fresh database needs no backup");

        run_all(&mut conn, &[first, second], Some(&backups), "0.2.0").unwrap();
        let files: Vec<_> = std::fs::read_dir(&backups).unwrap().flatten().collect();
        assert_eq!(files.len(), 1);

        // The backup holds the schema from before the new migration.
        let copy = Connection::open(files[0].path()).unwrap();
        let tables: i64 = copy
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE name IN ('a', 'b')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(tables, 1);
        // Windows does not delete a file that is still open, and pruning below removes this one.
        drop(copy);

        run_all(&mut conn, &[first, second], Some(&backups), "0.2.0").unwrap();
        assert_eq!(
            std::fs::read_dir(&backups).unwrap().count(),
            1,
            "up to date: no new backup"
        );

        // Only the newest backups are kept.
        for i in 0..7 {
            std::fs::write(backups.join(format!("old-{i}.db")), b"x").unwrap();
        }
        prune(&backups, BACKUPS_KEPT).unwrap();
        assert_eq!(std::fs::read_dir(&backups).unwrap().count(), BACKUPS_KEPT);
    }
}

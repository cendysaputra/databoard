use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use rusqlite::backup::Progress;
use rusqlite::{Connection, OpenFlags, MAIN_DB};
use time::macros::format_description;
use time::OffsetDateTime;

use crate::error::{AppError, Result};

/// Every backup file starts with this, so pruning never touches other files in the folder.
const PREFIX: &str = "dashboard-";
const EXTENSION: &str = "db";

/// Label of a backup the user asked for.
pub(super) const MANUAL: &str = "backup";
/// Label of the copy made before a restore.
pub(super) const BEFORE_RESTORE: &str = "before-restore";

/// Backup kinds, pruned separately.
#[derive(Clone, Copy)]
pub enum Kind {
    Manual,
    BeforeRestore,
    /// Labelled with an app version.
    Migration,
}

impl Kind {
    fn matches(self, name: &str) -> bool {
        let has = |label: &str| {
            name.strip_prefix(PREFIX)
                .and_then(|rest| rest.strip_prefix(label))
                .is_some_and(|rest| rest.starts_with('-'))
        };
        match self {
            Kind::Manual => has(MANUAL),
            Kind::BeforeRestore => has(BEFORE_RESTORE),
            Kind::Migration => !has(MANUAL) && !has(BEFORE_RESTORE),
        }
    }
}

/// `dashboard-<label>-<date>-<time>.db`; the label says what made the backup, e.g. a version.
pub(super) fn backup_name(label: &str) -> String {
    let format = format_description!("[year][month][day]-[hour][minute][second]");
    let stamp = OffsetDateTime::now_utc().format(format).unwrap_or_default();
    format!("{PREFIX}{label}-{stamp}.{EXTENSION}")
}

/// Writes a consistent copy of the open database to `target` using SQLite's online backup,
/// which is safe in WAL mode (a plain file copy could miss pages still in the WAL).
pub fn backup_to(conn: &Connection, target: &Path) -> Result<()> {
    if let Some(dir) = target.parent() {
        std::fs::create_dir_all(dir)?;
    }
    conn.backup(MAIN_DB, target, None::<fn(Progress)>)?;
    Ok(())
}

/// The backup files in `dir`, oldest first. A folder that does not exist has none.
fn backups_in(dir: &Path) -> Vec<(PathBuf, SystemTime)> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return Vec::new();
    };
    let mut backups: Vec<_> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension().is_some_and(|ext| ext == EXTENSION)
                && path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with(PREFIX))
        })
        .filter_map(|path| {
            let modified = std::fs::metadata(&path).and_then(|meta| meta.modified());
            modified.ok().map(|at| (path, at))
        })
        .collect();
    backups.sort_by_key(|(_, modified)| *modified);
    backups
}

/// Deletes the oldest backup files in `dir` so that at most `keep` remain.
/// Only files this app names are counted or deleted.
pub fn prune(dir: &Path, kind: Kind, keep: usize) -> Result<()> {
    let backups: Vec<_> = backups_in(dir)
        .into_iter()
        .filter(|(path, _)| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| kind.matches(name))
        })
        .collect();
    let excess = backups.len().saturating_sub(keep);
    for (path, _) in backups.into_iter().take(excess) {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

/// True when `dir` holds no backup newer than `max_age`.
pub fn is_due(dir: &Path, max_age: Duration) -> bool {
    backups_in(dir)
        .last()
        .and_then(|(_, modified)| modified.elapsed().ok())
        .is_none_or(|age| age >= max_age)
}

/// Makes sure `source` is a database of this app that this version can read, before it
/// replaces the live data. `latest` is the newest schema version this build knows.
pub(super) fn check(source: &Path, latest: usize) -> Result<()> {
    let not_ours = || AppError::validation("this file is not a DataBoard backup");
    let conn = Connection::open_with_flags(source, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|_| not_ours())?;
    let version: u32 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|_| not_ours())?;
    let has_settings: bool = conn
        .query_row(
            "SELECT count(*) > 0 FROM sqlite_master WHERE type = 'table' AND name = 'settings'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| not_ours())?;
    if version == 0 || !has_settings {
        return Err(not_ours());
    }
    if version as usize > latest {
        return Err(AppError::validation(
            "this backup was made by a newer version of the app",
        ));
    }
    Ok(())
}

/// Replaces the content of the open database with the backup at `source`.
pub(super) fn restore_into(conn: &mut Connection, source: &Path) -> Result<()> {
    // Statements prepared against the old content must not outlive it.
    conn.flush_prepared_statement_cache();
    conn.restore(MAIN_DB, source, None::<fn(Progress)>)?;
    Ok(())
}

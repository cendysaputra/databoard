use std::path::Path;

use rusqlite::backup::Progress;
use rusqlite::{Connection, MAIN_DB};

use crate::error::Result;

/// Writes a consistent copy of the open database to `target` using SQLite's online backup,
/// which is safe in WAL mode (a plain file copy could miss pages still in the WAL).
pub fn backup_to(conn: &Connection, target: &Path) -> Result<()> {
    if let Some(dir) = target.parent() {
        std::fs::create_dir_all(dir)?;
    }
    conn.backup(MAIN_DB, target, None::<fn(Progress)>)?;
    Ok(())
}

/// Deletes the oldest `.db` files in `dir` so that at most `keep` remain.
pub fn prune(dir: &Path, keep: usize) -> Result<()> {
    let mut backups: Vec<_> = std::fs::read_dir(dir)?
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "db"))
        .collect();
    backups.sort_by_key(|path| {
        std::fs::metadata(path)
            .and_then(|meta| meta.modified())
            .ok()
    });
    let excess = backups.len().saturating_sub(keep);
    for path in backups.into_iter().take(excess) {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

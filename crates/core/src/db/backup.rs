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

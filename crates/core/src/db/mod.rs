//! Database handle: opens the SQLite file, applies PRAGMAs and runs migrations.

mod backup;
mod migrations;

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

use crate::error::Result;
use crate::DB_FILE;

pub use backup::{backup_to, is_due as backup_is_due};

const WAL_SIZE_LIMIT_BYTES: i64 = 4 * 1024 * 1024;

/// How many backups made on request or on schedule are kept in one folder.
const BACKUPS_KEPT: usize = 8;

/// Folder inside the app data directory for backups the app makes for its own safety.
const BACKUP_FOLDER: &str = "backups";

/// One connection behind a mutex. That is enough for a single-user app and keeps memory low;
/// the MCP server opens its own connection to the same file (WAL + busy_timeout handle that).
pub struct Db {
    conn: Mutex<Connection>,
    path: Option<PathBuf>,
}

impl Db {
    /// Opens (or creates) `data_dir/dashboard.db`. A backup is written to `data_dir/backups/`
    /// before any pending migration touches an existing database.
    pub fn open(data_dir: &Path, app_version: &str) -> Result<Self> {
        std::fs::create_dir_all(data_dir)?;
        let path = data_dir.join(DB_FILE);
        let mut conn = Connection::open(&path)?;
        configure(&conn)?;
        migrations::run(&mut conn, Some(&data_dir.join(BACKUP_FOLDER)), app_version)?;
        Ok(Self {
            conn: Mutex::new(conn),
            path: Some(path),
        })
    }

    /// In-memory database with the full schema, for tests.
    pub fn open_in_memory() -> Result<Self> {
        let mut conn = Connection::open_in_memory()?;
        configure(&conn)?;
        migrations::run(&mut conn, None, "test")?;
        Ok(Self {
            conn: Mutex::new(conn),
            path: None,
        })
    }

    pub fn path(&self) -> Option<&Path> {
        self.path.as_deref()
    }

    /// The folder backups go to when the user has not chosen one; `None` for an in-memory database.
    pub fn default_backup_dir(&self) -> Option<PathBuf> {
        let data_dir = self.path.as_deref()?.parent()?;
        Some(data_dir.join(BACKUP_FOLDER))
    }

    /// Writes a backup into `dir` and returns its path. Older backups there are pruned.
    pub fn backup_into(&self, dir: &Path) -> Result<PathBuf> {
        let target = dir.join(backup::backup_name("backup"));
        backup::backup_to(&self.lock(), &target)?;
        backup::prune(dir, BACKUPS_KEPT)?;
        Ok(target)
    }

    /// Replaces all data with the backup file at `source`. The current data is first saved
    /// next to the other safety backups, and an older backup is brought to the current schema.
    pub fn restore_from(&self, source: &Path, app_version: &str) -> Result<()> {
        backup::check(source, migrations::latest())?;
        let mut conn = self.lock();
        if let Some(dir) = self.default_backup_dir() {
            backup::backup_to(&conn, &dir.join(backup::backup_name("before-restore")))?;
        }
        backup::restore_into(&mut conn, source)?;
        configure(&conn)?;
        migrations::run(&mut conn, None, app_version)
    }

    /// Runs `f` with the connection.
    pub fn with<T>(&self, f: impl FnOnce(&Connection) -> Result<T>) -> Result<T> {
        f(&self.lock())
    }

    /// Runs `f` inside a transaction; it commits only when `f` returns `Ok`.
    pub fn with_tx<T>(&self, f: impl FnOnce(&Connection) -> Result<T>) -> Result<T> {
        let mut conn = self.lock();
        let tx = conn.transaction()?;
        let value = f(&tx)?;
        tx.commit()?;
        Ok(value)
    }

    fn lock(&self) -> MutexGuard<'_, Connection> {
        // A poisoned lock only means another thread panicked; the connection is still usable.
        self.conn
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

fn configure(conn: &Connection) -> Result<()> {
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "busy_timeout", 5000)?;
    // Safe with WAL and avoids a disk sync on every write.
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    // Keeps the write-ahead log file from staying large after a burst of writes.
    conn.pragma_update(None, "journal_size_limit", WAL_SIZE_LIMIT_BYTES)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;
    use crate::domain::settings;

    fn rename_app(db: &Db, name: &str) {
        db.with_tx(|conn| {
            let mut current = settings::get(conn)?;
            current.app_name = name.into();
            settings::update(conn, &current)
        })
        .unwrap();
    }

    #[test]
    fn backup_and_restore_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let db = Db::open(&dir.path().join("data"), "test").unwrap();
        rename_app(&db, "Sebelum");

        let chosen = dir.path().join("chosen");
        assert!(backup_is_due(&chosen, Duration::from_secs(3600)));
        let file = db.backup_into(&chosen).unwrap();
        assert!(file.is_file());
        assert!(!backup_is_due(&chosen, Duration::from_secs(3600)));

        rename_app(&db, "Sesudah");
        db.restore_from(&file, "test").unwrap();
        assert_eq!(db.with(settings::get).unwrap().app_name, "Sebelum");

        // What was there before the restore is kept as a safety backup.
        let safety = db.default_backup_dir().unwrap();
        assert_eq!(std::fs::read_dir(safety).unwrap().count(), 1);
        // The database still takes writes after a restore.
        rename_app(&db, "Lagi");
    }

    #[test]
    fn restore_rejects_foreign_files() {
        let dir = tempfile::tempdir().unwrap();
        let db = Db::open(&dir.path().join("data"), "test").unwrap();

        let text = dir.path().join("notes.db");
        std::fs::write(&text, b"not a database").unwrap();
        assert!(db.restore_from(&text, "test").is_err());

        let other = dir.path().join("other.db");
        Connection::open(&other)
            .unwrap()
            .execute_batch("CREATE TABLE x (id INTEGER); PRAGMA user_version = 1;")
            .unwrap();
        assert!(db.restore_from(&other, "test").is_err());

        // A refused restore leaves no safety backup behind and the data untouched.
        assert!(!db.default_backup_dir().unwrap().exists());
        assert!(db.with(settings::get).is_ok());
    }
}

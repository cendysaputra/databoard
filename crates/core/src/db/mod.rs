//! Database handle: opens the SQLite file, applies PRAGMAs and runs migrations.

mod backup;
mod migrations;

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

use crate::error::Result;
use crate::DB_FILE;

pub use backup::backup_to;

const WAL_SIZE_LIMIT_BYTES: i64 = 4 * 1024 * 1024;

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
        migrations::run(&mut conn, Some(&data_dir.join("backups")), app_version)?;
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

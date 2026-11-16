//! Shared core of the dashboard: SQLite access and all business logic.
//! The Tauri app and the MCP server both call into `domain`, so rules behave the same in each.

pub mod db;
pub mod domain;
pub mod error;
mod util;

pub use db::Db;
pub use error::{AppError, Result};

/// File name of the database inside the app data directory.
pub const DB_FILE: &str = "dashboard.db";

/// The app's identifier; must match `identifier` in `src-tauri/tauri.conf.json`. The app data
/// folder and the stored Google token are named after it, so it never changes after release.
pub const APP_IDENTIFIER: &str = "com.cendi.databoard";

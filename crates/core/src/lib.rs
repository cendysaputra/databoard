//! Shared core of the dashboard: SQLite access and all business logic.
//!
//! Both the Tauri app and the MCP server call into `domain`, so a rule
//! implemented here behaves the same no matter who triggers it.

pub mod db;
pub mod domain;
pub mod error;
mod util;

pub use db::Db;
pub use error::{AppError, Result};

/// File name of the database inside the app data directory.
pub const DB_FILE: &str = "dashboard.db";

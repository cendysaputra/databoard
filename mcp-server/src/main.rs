//! MCP server for the dashboard (stdio transport).
//!
//! Phase 1 only settles how the database is located and proves the shared core links.
//! The MCP tools themselves arrive in phase 5.

use std::path::PathBuf;
use std::process::ExitCode;

use dashboard_core::{Db, DB_FILE};

/// Must match `identifier` in `src-tauri/tauri.conf.json`.
const APP_IDENTIFIER: &str = "com.cendi.dashboard";

/// Database file: `--db <path>`, then `DASHBOARD_DB`, then the app's own data directory.
fn db_path() -> Option<PathBuf> {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        if arg == "--db" {
            return args.next().map(PathBuf::from);
        }
    }
    if let Some(path) = std::env::var_os("DASHBOARD_DB") {
        return Some(PathBuf::from(path));
    }
    std::env::var_os("APPDATA").map(|dir| PathBuf::from(dir).join(APP_IDENTIFIER).join(DB_FILE))
}

fn main() -> ExitCode {
    let Some(path) = db_path() else {
        eprintln!("mcp-server: no database path; pass --db <path> or set DASHBOARD_DB");
        return ExitCode::FAILURE;
    };
    let Some(data_dir) = path.parent() else {
        eprintln!("mcp-server: invalid database path {}", path.display());
        return ExitCode::FAILURE;
    };
    match Db::open(data_dir, env!("CARGO_PKG_VERSION")) {
        Ok(_) => {
            eprintln!(
                "mcp-server: database ready at {}; MCP tools arrive in phase 5",
                path.display()
            );
            ExitCode::SUCCESS
        }
        Err(err) => {
            eprintln!("mcp-server: cannot open database: {err}");
            ExitCode::FAILURE
        }
    }
}

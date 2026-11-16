//! MCP server for the dashboard (stdio transport), on the same database file as the app.
//! Standard output carries the protocol only; anything for a human goes to standard error.

mod tools;

use std::path::PathBuf;
use std::process::ExitCode;

use dashboard_core::{Db, DB_FILE};
use rmcp::transport::stdio;
use rmcp::ServiceExt;

/// Must match `identifier` in `src-tauri/tauri.conf.json`.
const APP_IDENTIFIER: &str = "com.cendi.databoard";

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

#[tokio::main(flavor = "current_thread")]
async fn main() -> ExitCode {
    let Some(path) = db_path() else {
        eprintln!("mcp-server: no database path; pass --db <path> or set DASHBOARD_DB");
        return ExitCode::FAILURE;
    };
    let Some(data_dir) = path.parent() else {
        eprintln!("mcp-server: invalid database path {}", path.display());
        return ExitCode::FAILURE;
    };
    let db = match Db::open(data_dir, env!("CARGO_PKG_VERSION")) {
        Ok(db) => db,
        Err(err) => {
            eprintln!("mcp-server: cannot open database: {err}");
            return ExitCode::FAILURE;
        }
    };
    let service = match tools::Dashboard::new(db).serve(stdio()).await {
        Ok(service) => service,
        Err(err) => {
            eprintln!("mcp-server: cannot start: {err}");
            return ExitCode::FAILURE;
        }
    };
    // Runs until the client closes the connection.
    match service.waiting().await {
        Ok(_) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("mcp-server: stopped: {err}");
            ExitCode::FAILURE
        }
    }
}

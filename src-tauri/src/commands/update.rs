//! App updates. Nothing is installed silently: the frontend asks whether a newer version
//! exists, shows that to the user, and only an explicit request downloads and installs it.

use dashboard_core::AppError;
use tauri::AppHandle;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::error::CommandResult;

async fn newer_version(app: &AppHandle) -> CommandResult<Option<Update>> {
    app.updater()
        .map_err(AppError::external)?
        .check()
        .await
        .map_err(AppError::external)
}

/// The version of a newer release, or `None` when the app is up to date.
#[tauri::command]
pub async fn update_check(app: AppHandle) -> CommandResult<Option<String>> {
    Ok(newer_version(&app).await?.map(|update| update.version))
}

/// Downloads and installs the newer release, then restarts into it. The download is
/// verified against the public key in `tauri.conf.json` before anything is installed.
#[tauri::command]
pub async fn update_install(app: AppHandle) -> CommandResult<()> {
    let Some(update) = newer_version(&app).await? else {
        return Ok(());
    };
    let bytes = update
        .download(|_received, _total| {}, || {})
        .await
        .map_err(AppError::external)?;
    // An AI client may be running the bundled MCP server; Windows keeps a running program's
    // file locked, and the installer could then not replace it.
    stop_bundled_mcp_server();
    update.install(bytes).map_err(AppError::external)?;
    app.restart()
}

/// Ends the MCP server that ships next to this app, and only that one: other programs can use
/// the same file name. The AI client reconnects to the new server once it is restarted.
#[cfg(windows)]
fn stop_bundled_mcp_server() {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let Ok(path) = super::mcp::mcp_server_path() else {
        return;
    };
    let script = format!(
        "Get-Process -Name mcp-server -ErrorAction SilentlyContinue | \
         Where-Object {{ $_.Path -eq '{}' }} | Stop-Process -Force",
        // A quote inside a PowerShell single-quoted string is written twice.
        path.replace('\'', "''")
    );
    let stopped = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .status();
    if let Err(err) = stopped {
        eprintln!("update: could not stop the MCP server: {err}");
    }
}

#[cfg(not(windows))]
fn stop_bundled_mcp_server() {}

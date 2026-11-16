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
    update
        .download_and_install(|_received, _total| {}, || {})
        .await
        .map_err(AppError::external)?;
    app.restart()
}

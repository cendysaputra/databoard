//! Backups of the database: where they go, making one now, and restoring from a file.
//! The dialogs are opened here, so the frontend never handles file system paths it did not ask for.

use std::path::PathBuf;

use dashboard_core::domain::settings;
use dashboard_core::{AppError, Db};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::error::CommandResult;

/// The folder the user chose in Settings, or the app's own backup folder.
pub(crate) fn backup_dir(db: &Db) -> CommandResult<PathBuf> {
    let chosen = db.with(settings::get)?.backup_dir;
    chosen
        .map(PathBuf::from)
        .or_else(|| db.default_backup_dir())
        .ok_or_else(|| AppError::validation("no backup folder"))
}

/// Asks for a folder to keep backups in. `None` when the dialog was cancelled.
#[tauri::command]
pub async fn backup_pick_dir(app: AppHandle) -> CommandResult<Option<String>> {
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = folder.into_path().map_err(AppError::external)?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Writes a backup now and returns the path of the file.
#[tauri::command(async)]
pub fn backup_run(db: State<'_, Db>) -> CommandResult<String> {
    let file = db.backup_into(&backup_dir(&db)?)?;
    Ok(file.to_string_lossy().into_owned())
}

/// Asks for a backup file and replaces all data with it. `false` when the dialog was cancelled.
#[tauri::command]
pub async fn backup_restore(app: AppHandle) -> CommandResult<bool> {
    let db = app.state::<Db>();
    let mut dialog = app.dialog().file().add_filter("DataBoard backup", &["db"]);
    if let Ok(dir) = backup_dir(&db) {
        dialog = dialog.set_directory(dir);
    }
    let Some(file) = dialog.blocking_pick_file() else {
        return Ok(false);
    };
    let path = file.into_path().map_err(AppError::external)?;
    db.restore_from(&path, &app.package_info().version.to_string())?;
    Ok(true)
}

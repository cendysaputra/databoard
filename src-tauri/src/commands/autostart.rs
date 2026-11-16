use dashboard_core::AppError;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

use crate::error::CommandResult;

/// Whether the app is registered to start when the user signs in to Windows.
#[tauri::command(async)]
pub fn autostart_get(app: AppHandle) -> CommandResult<bool> {
    app.autolaunch().is_enabled().map_err(AppError::external)
}

#[tauri::command(async)]
pub fn autostart_set(app: AppHandle, enabled: bool) -> CommandResult<bool> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(AppError::external)?;
    } else {
        autostart.disable().map_err(AppError::external)?;
    }
    Ok(enabled)
}

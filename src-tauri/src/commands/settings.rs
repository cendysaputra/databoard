use dashboard_core::domain::settings::{self, Settings};
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command(async)]
pub fn settings_get(db: State<'_, Db>) -> CommandResult<Settings> {
    db.with(settings::get)
}

#[tauri::command(async)]
pub fn settings_update(db: State<'_, Db>, input: Settings) -> CommandResult<Settings> {
    db.with_tx(|conn| settings::update(conn, &input))
}

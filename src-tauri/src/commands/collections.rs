use dashboard_core::domain::collections::{self, Collection, CollectionInput};
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command]
pub fn collections_list(db: State<'_, Db>) -> CommandResult<Vec<Collection>> {
    db.with(collections::list)
}

#[tauri::command]
pub fn collections_get(db: State<'_, Db>, id: String) -> CommandResult<Collection> {
    db.with(|conn| collections::get(conn, &id))
}

#[tauri::command]
pub fn collections_create(db: State<'_, Db>, input: CollectionInput) -> CommandResult<Collection> {
    db.with(|conn| collections::create(conn, &input))
}

#[tauri::command]
pub fn collections_update(
    db: State<'_, Db>,
    id: String,
    input: CollectionInput,
) -> CommandResult<Collection> {
    db.with(|conn| collections::update(conn, &id, &input))
}

#[tauri::command]
pub fn collections_remove(db: State<'_, Db>, id: String) -> CommandResult<()> {
    db.with_tx(|conn| collections::remove(conn, &id))
}

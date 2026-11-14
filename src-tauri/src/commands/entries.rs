use dashboard_core::domain::entries::{self, Entry, EntryInput};
use dashboard_core::domain::Page;
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command]
pub fn entries_list(
    db: State<'_, Db>,
    collection_id: String,
    page: Page,
) -> CommandResult<Vec<Entry>> {
    db.with(|conn| entries::list(conn, &collection_id, page))
}

#[tauri::command]
pub fn entries_get(db: State<'_, Db>, id: String) -> CommandResult<Entry> {
    db.with(|conn| entries::get(conn, &id))
}

#[tauri::command]
pub fn entries_create(
    db: State<'_, Db>,
    collection_id: String,
    input: EntryInput,
) -> CommandResult<Entry> {
    db.with(|conn| entries::create(conn, &collection_id, &input))
}

#[tauri::command]
pub fn entries_update(db: State<'_, Db>, id: String, input: EntryInput) -> CommandResult<Entry> {
    db.with(|conn| entries::update(conn, &id, &input))
}

#[tauri::command]
pub fn entries_remove(db: State<'_, Db>, id: String) -> CommandResult<()> {
    db.with(|conn| entries::remove(conn, &id))
}

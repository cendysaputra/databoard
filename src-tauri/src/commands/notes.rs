use dashboard_core::domain::notes::{self, Note, NoteInput};
use dashboard_core::domain::Page;
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command]
pub fn notes_list(
    db: State<'_, Db>,
    page: Page,
    label_id: Option<String>,
) -> CommandResult<Vec<Note>> {
    db.with(|conn| notes::list(conn, page, label_id.as_deref()))
}

#[tauri::command]
pub fn notes_get(db: State<'_, Db>, id: String) -> CommandResult<Note> {
    db.with(|conn| notes::get(conn, &id))
}

#[tauri::command]
pub fn notes_create(db: State<'_, Db>, input: NoteInput) -> CommandResult<Note> {
    db.with_tx(|conn| notes::create(conn, &input))
}

#[tauri::command]
pub fn notes_update(db: State<'_, Db>, id: String, input: NoteInput) -> CommandResult<Note> {
    db.with_tx(|conn| notes::update(conn, &id, &input))
}

#[tauri::command]
pub fn notes_remove(db: State<'_, Db>, id: String) -> CommandResult<()> {
    db.with(|conn| notes::remove(conn, &id))
}

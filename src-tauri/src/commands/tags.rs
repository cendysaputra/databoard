use dashboard_core::domain::tags::{self, Tag, TagInput};
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command(async)]
pub fn tags_list(db: State<'_, Db>) -> CommandResult<Vec<Tag>> {
    db.with(tags::list)
}

#[tauri::command(async)]
pub fn tags_create(db: State<'_, Db>, input: TagInput) -> CommandResult<Tag> {
    db.with(|conn| tags::create(conn, &input))
}

#[tauri::command(async)]
pub fn tags_update(db: State<'_, Db>, id: String, input: TagInput) -> CommandResult<Tag> {
    db.with(|conn| tags::update(conn, &id, &input))
}

#[tauri::command(async)]
pub fn tags_remove(db: State<'_, Db>, id: String) -> CommandResult<()> {
    db.with_tx(|conn| tags::remove(conn, &id))
}

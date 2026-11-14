use dashboard_core::domain::reminders::{self, Reminder, ReminderInput};
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command]
pub fn reminders_list(db: State<'_, Db>, upcoming_only: bool) -> CommandResult<Vec<Reminder>> {
    db.with(|conn| reminders::list(conn, upcoming_only))
}

#[tauri::command]
pub fn reminders_create(db: State<'_, Db>, input: ReminderInput) -> CommandResult<Reminder> {
    db.with(|conn| reminders::create(conn, &input))
}

#[tauri::command]
pub fn reminders_complete(db: State<'_, Db>, id: String) -> CommandResult<Reminder> {
    db.with(|conn| reminders::complete(conn, &id))
}

#[tauri::command]
pub fn reminders_remove(db: State<'_, Db>, id: String) -> CommandResult<()> {
    db.with(|conn| reminders::remove(conn, &id))
}

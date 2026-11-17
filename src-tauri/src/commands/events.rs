use dashboard_core::domain::events::{self, CalendarEvent, EventInput, EventRange};
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command(async)]
pub fn events_list(db: State<'_, Db>, range: EventRange) -> CommandResult<Vec<CalendarEvent>> {
    db.with(|conn| events::list(conn, &range))
}

#[tauri::command(async)]
pub fn events_get(db: State<'_, Db>, id: String) -> CommandResult<CalendarEvent> {
    db.with(|conn| events::get(conn, &id))
}

#[tauri::command(async)]
pub fn events_create(db: State<'_, Db>, input: EventInput) -> CommandResult<CalendarEvent> {
    db.with(|conn| events::create(conn, &input))
}

#[tauri::command(async)]
pub fn events_update(
    db: State<'_, Db>,
    id: String,
    input: EventInput,
) -> CommandResult<CalendarEvent> {
    db.with_tx(|conn| events::update(conn, &id, &input))
}

#[tauri::command(async)]
pub fn events_remove(db: State<'_, Db>, id: String) -> CommandResult<()> {
    db.with_tx(|conn| events::remove(conn, &id))
}

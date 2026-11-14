use dashboard_core::domain::overview::{self, Overview, OverviewQuery};
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command]
pub fn overview_get(db: State<'_, Db>, query: OverviewQuery) -> CommandResult<Overview> {
    db.with(|conn| overview::get(conn, &query))
}

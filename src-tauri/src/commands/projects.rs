use dashboard_core::domain::projects::{self, Project, ProjectInput, ProjectStatus};
use dashboard_core::Db;
use tauri::State;

use crate::error::CommandResult;

#[tauri::command(async)]
pub fn projects_list(
    db: State<'_, Db>,
    status: Option<ProjectStatus>,
) -> CommandResult<Vec<Project>> {
    db.with(|conn| projects::list(conn, status))
}

#[tauri::command(async)]
pub fn projects_get(db: State<'_, Db>, id: String) -> CommandResult<Project> {
    db.with(|conn| projects::get(conn, &id))
}

#[tauri::command(async)]
pub fn projects_create(db: State<'_, Db>, input: ProjectInput) -> CommandResult<Project> {
    db.with(|conn| projects::create(conn, &input))
}

#[tauri::command(async)]
pub fn projects_update(
    db: State<'_, Db>,
    id: String,
    input: ProjectInput,
) -> CommandResult<Project> {
    db.with(|conn| projects::update(conn, &id, &input))
}

#[tauri::command(async)]
pub fn projects_remove(db: State<'_, Db>, id: String) -> CommandResult<()> {
    db.with(|conn| projects::remove(conn, &id))
}

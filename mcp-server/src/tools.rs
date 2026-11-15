//! The MCP tools. Each one is a thin wrapper: read the arguments, call `dashboard_core::domain`,
//! answer with compact JSON. Updates take only the fields to change; deletes are soft deletes.

use std::sync::Arc;

use dashboard_core::domain::events::{self, EventInput, EventRange};
use dashboard_core::domain::notes::{self, NoteInput, NoteStatus};
use dashboard_core::domain::projects::{self, ProjectInput, ProjectStatus};
use dashboard_core::domain::reminders::{self, ReminderInput};
use dashboard_core::domain::Page;
use dashboard_core::{AppError, Db, Result as CoreResult};
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, ContentBlock, Implementation, ServerCapabilities, ServerConfig};
use rmcp::{schemars, tool, tool_handler, tool_router, ServerHandler};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

/// Most notes one search answers with.
const SEARCH_LIMIT: u32 = 50;

#[derive(Clone)]
pub struct Dashboard {
    db: Arc<Db>,
    tool_router: ToolRouter<Self>,
}

impl Dashboard {
    pub fn new(db: Db) -> Self {
        Self {
            db: Arc::new(db),
            tool_router: Self::tool_router(),
        }
    }
}

/// The tool result: the value as JSON, or the error message marked as an error.
fn reply<T: Serialize>(result: CoreResult<T>) -> CallToolResult {
    match result.and_then(|value| Ok(serde_json::to_string(&value)?)) {
        Ok(json) => CallToolResult::success(vec![ContentBlock::text(json)]),
        Err(err) => CallToolResult::error(vec![ContentBlock::text(err.to_string())]),
    }
}

/// Reads a status such as `"draft"` written as plain text.
fn status<T: DeserializeOwned>(value: &str) -> CoreResult<T> {
    serde_json::from_value(serde_json::Value::String(value.to_lowercase()))
        .map_err(|_| AppError::validation(format!("unknown status \"{value}\"")))
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct IdArgs {
    pub id: String,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct ListEventsArgs {
    #[schemars(description = "Start of the window, RFC 3339, e.g. 2026-11-20T00:00:00+07:00")]
    pub from: String,
    #[schemars(description = "End of the window, RFC 3339")]
    pub to: String,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct CreateEventArgs {
    pub title: String,
    #[schemars(description = "RFC 3339 timestamp")]
    pub start_at: String,
    #[schemars(description = "RFC 3339 timestamp, not before start_at")]
    pub end_at: String,
    pub description: Option<String>,
    pub location: Option<String>,
    #[schemars(
        description = "All-day events run from local midnight to the midnight after the last day"
    )]
    pub all_day: Option<bool>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct UpdateEventArgs {
    pub id: String,
    pub title: Option<String>,
    pub start_at: Option<String>,
    pub end_at: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub all_day: Option<bool>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct ListRemindersArgs {
    #[schemars(description = "true (default): only reminders not done yet")]
    pub upcoming: Option<bool>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct CreateReminderArgs {
    pub message: String,
    #[schemars(description = "When to remind, RFC 3339")]
    pub remind_at: String,
    #[schemars(description = "Event this reminder belongs to, if any")]
    pub event_id: Option<String>,
    #[schemars(description = "Note this reminder belongs to, if any")]
    pub note_id: Option<String>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct SearchNotesArgs {
    #[schemars(description = "Words that must all appear in the title or body")]
    pub query: String,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct CreateNoteArgs {
    pub title: String,
    #[schemars(description = "The body as markdown")]
    pub body_md: String,
    #[schemars(description = "The day the note is about, YYYY-MM-DD")]
    pub note_date: String,
    #[schemars(description = "Event the note is linked to, if any")]
    pub event_id: Option<String>,
    pub pinned: Option<bool>,
    #[schemars(description = "draft (default) or published")]
    pub status: Option<String>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct UpdateNoteArgs {
    pub id: String,
    pub title: Option<String>,
    pub body_md: Option<String>,
    pub note_date: Option<String>,
    pub event_id: Option<String>,
    pub pinned: Option<bool>,
    pub status: Option<String>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct ListProjectsArgs {
    #[schemars(description = "Only projects with this status: draft, published or archived")]
    pub status: Option<String>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct CreateProjectArgs {
    pub title: String,
    pub client: Option<String>,
    pub year: Option<i32>,
    pub role: Option<String>,
    #[schemars(description = "What sort of work it is, e.g. Website")]
    pub kind: Option<String>,
    #[schemars(description = "Tools used, e.g. [\"Figma\", \"Laravel\"]")]
    pub stack: Option<Vec<String>>,
    pub url: Option<String>,
    pub repo_url: Option<String>,
    #[schemars(description = "The description as markdown")]
    pub description_md: Option<String>,
    #[schemars(description = "draft (default), published or archived")]
    pub status: Option<String>,
}

#[derive(Deserialize, schemars::JsonSchema)]
pub struct UpdateProjectArgs {
    pub id: String,
    pub title: Option<String>,
    pub client: Option<String>,
    pub year: Option<i32>,
    pub role: Option<String>,
    pub kind: Option<String>,
    pub stack: Option<Vec<String>>,
    pub url: Option<String>,
    pub repo_url: Option<String>,
    pub description_md: Option<String>,
    pub status: Option<String>,
}

#[tool_router]
impl Dashboard {
    #[tool(description = "List calendar events that overlap a time window, by start time")]
    fn list_events(&self, Parameters(args): Parameters<ListEventsArgs>) -> CallToolResult {
        let range = EventRange {
            from: args.from,
            to: args.to,
        };
        reply(self.db.with(|conn| events::list(conn, &range)))
    }

    #[tool(description = "Create a calendar event")]
    fn create_event(&self, Parameters(args): Parameters<CreateEventArgs>) -> CallToolResult {
        let input = EventInput {
            title: args.title,
            description: args.description,
            location: args.location,
            start_at: args.start_at,
            end_at: args.end_at,
            all_day: args.all_day.unwrap_or(false),
            color: None,
        };
        reply(self.db.with(|conn| events::create(conn, &input)))
    }

    #[tool(description = "Change a calendar event; only the given fields change")]
    fn update_event(&self, Parameters(args): Parameters<UpdateEventArgs>) -> CallToolResult {
        reply(self.db.with_tx(|conn| {
            let event = events::get(conn, &args.id)?;
            let input = EventInput {
                title: args.title.unwrap_or(event.title),
                description: args.description.or(event.description),
                location: args.location.or(event.location),
                start_at: args.start_at.unwrap_or(event.start_at),
                end_at: args.end_at.unwrap_or(event.end_at),
                all_day: args.all_day.unwrap_or(event.all_day),
                color: event.color,
            };
            events::update(conn, &args.id, &input)
        }))
    }

    #[tool(description = "Delete a calendar event (soft delete)")]
    fn delete_event(&self, Parameters(args): Parameters<IdArgs>) -> CallToolResult {
        reply(self.db.with_tx(|conn| events::remove(conn, &args.id)))
    }

    #[tool(description = "List reminders by time; by default only those not done yet")]
    fn list_reminders(&self, Parameters(args): Parameters<ListRemindersArgs>) -> CallToolResult {
        let upcoming = args.upcoming.unwrap_or(true);
        reply(self.db.with(|conn| reminders::list(conn, upcoming)))
    }

    #[tool(
        description = "Create a reminder; the app shows it as a notification when its time comes"
    )]
    fn create_reminder(&self, Parameters(args): Parameters<CreateReminderArgs>) -> CallToolResult {
        let input = ReminderInput {
            event_id: args.event_id,
            note_id: args.note_id,
            remind_at: args.remind_at,
            message: args.message,
        };
        reply(self.db.with(|conn| reminders::create(conn, &input)))
    }

    #[tool(description = "Mark a reminder as done")]
    fn complete_reminder(&self, Parameters(args): Parameters<IdArgs>) -> CallToolResult {
        reply(self.db.with(|conn| reminders::complete(conn, &args.id)))
    }

    #[tool(
        description = "Full-text search in notes; answers with summaries, use get_note for a body"
    )]
    fn search_notes(&self, Parameters(args): Parameters<SearchNotesArgs>) -> CallToolResult {
        let page = Page {
            limit: SEARCH_LIMIT,
            offset: 0,
        };
        reply(self.db.with(|conn| notes::search(conn, &args.query, page)))
    }

    #[tool(description = "Read one note with its full markdown body")]
    fn get_note(&self, Parameters(args): Parameters<IdArgs>) -> CallToolResult {
        reply(self.db.with(|conn| notes::get(conn, &args.id)))
    }

    #[tool(description = "Create a note; the body is markdown")]
    fn create_note(&self, Parameters(args): Parameters<CreateNoteArgs>) -> CallToolResult {
        reply(self.db.with_tx(|conn| {
            let input = NoteInput {
                title: args.title,
                body_md: args.body_md,
                event_id: args.event_id,
                project_id: None,
                pinned: args.pinned.unwrap_or(false),
                note_date: args.note_date,
                status: match args.status.as_deref() {
                    Some(value) => status(value)?,
                    None => NoteStatus::Draft,
                },
                label_ids: Vec::new(),
            };
            notes::create(conn, &input)
        }))
    }

    #[tool(description = "Change a note; only the given fields change")]
    fn update_note(&self, Parameters(args): Parameters<UpdateNoteArgs>) -> CallToolResult {
        reply(self.db.with_tx(|conn| {
            let note = notes::get(conn, &args.id)?;
            let input = NoteInput {
                title: args.title.unwrap_or(note.title),
                body_md: args.body_md.unwrap_or(note.body_md),
                event_id: args.event_id.or(note.event_id),
                project_id: note.project_id,
                pinned: args.pinned.unwrap_or(note.pinned),
                note_date: args.note_date.unwrap_or(note.note_date),
                status: match args.status.as_deref() {
                    Some(value) => status(value)?,
                    None => note.status,
                },
                label_ids: note.label_ids,
            };
            notes::update(conn, &args.id, &input)
        }))
    }

    #[tool(description = "List portfolio projects in their manual order, optionally by status")]
    fn list_projects(&self, Parameters(args): Parameters<ListProjectsArgs>) -> CallToolResult {
        reply(self.db.with(|conn| {
            let wanted: Option<ProjectStatus> = args.status.as_deref().map(status).transpose()?;
            projects::list(conn, wanted)
        }))
    }

    #[tool(description = "Read one portfolio project")]
    fn get_project(&self, Parameters(args): Parameters<IdArgs>) -> CallToolResult {
        reply(self.db.with(|conn| projects::get(conn, &args.id)))
    }

    #[tool(description = "Create a portfolio project; it is placed after the existing ones")]
    fn create_project(&self, Parameters(args): Parameters<CreateProjectArgs>) -> CallToolResult {
        reply(self.db.with_tx(|conn| {
            let last = projects::list(conn, None)?
                .iter()
                .map(|project| project.sort_order)
                .max()
                .unwrap_or(0);
            let input = ProjectInput {
                title: args.title,
                client: args.client,
                year: args.year,
                role: args.role,
                kind: args.kind,
                stack: args.stack.unwrap_or_default(),
                url: args.url,
                repo_url: args.repo_url,
                description_md: args.description_md.unwrap_or_default(),
                cover_path: None,
                status: match args.status.as_deref() {
                    Some(value) => status(value)?,
                    None => ProjectStatus::Draft,
                },
                sort_order: last + 1,
            };
            projects::create(conn, &input)
        }))
    }

    #[tool(description = "Change a portfolio project; only the given fields change")]
    fn update_project(&self, Parameters(args): Parameters<UpdateProjectArgs>) -> CallToolResult {
        reply(self.db.with_tx(|conn| {
            let project = projects::get(conn, &args.id)?;
            let input = ProjectInput {
                title: args.title.unwrap_or(project.title),
                client: args.client.or(project.client),
                year: args.year.or(project.year),
                role: args.role.or(project.role),
                kind: args.kind.or(project.kind),
                stack: args.stack.unwrap_or(project.stack),
                url: args.url.or(project.url),
                repo_url: args.repo_url.or(project.repo_url),
                description_md: args.description_md.unwrap_or(project.description_md),
                cover_path: project.cover_path,
                status: match args.status.as_deref() {
                    Some(value) => status(value)?,
                    None => project.status,
                },
                sort_order: project.sort_order,
            };
            projects::update(conn, &args.id, &input)
        }))
    }
}

#[tool_handler(router = self.tool_router)]
impl ServerHandler for Dashboard {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("databoard", env!("CARGO_PKG_VERSION")))
            .with_instructions(
                "DataBoard, a personal dashboard: calendar events, reminders, meeting notes and \
             portfolio projects. Timestamps are RFC 3339; days are YYYY-MM-DD.",
            )
    }
}

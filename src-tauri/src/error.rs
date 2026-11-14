//! The app has one error type, defined in the core crate so the MCP server shares it.
//! It serializes to `{ code, message }` when a command fails.

pub use dashboard_core::AppError;

pub type CommandResult<T> = Result<T, AppError>;

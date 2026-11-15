//! Thin command wrappers: take input, call `dashboard_core::domain`, return the result.
//! Validation and business rules live in the domain functions.

pub mod autostart;
pub mod backup;
pub mod events;
pub mod mcp;
pub mod media;
pub mod notes;
pub mod overview;
pub mod projects;
pub mod recordings;
pub mod reminders;
pub mod settings;
pub mod tags;
pub mod update;

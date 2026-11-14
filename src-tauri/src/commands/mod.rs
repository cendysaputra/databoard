//! Thin command wrappers: take input, call `dashboard_core::domain`, return the result.
//! Validation and business rules live in the domain functions.

pub mod events;
pub mod notes;
pub mod projects;
pub mod reminders;
pub mod settings;

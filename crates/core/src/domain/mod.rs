//! Business logic. Every function takes a `&Connection` and plain input types,
//! so Tauri commands and MCP tools stay thin wrappers around the same code.

pub mod collections;
pub mod entries;
pub mod events;
pub mod notes;
pub mod overview;
pub mod projects;
pub mod reminders;
pub mod settings;
pub mod tags;

use serde::Deserialize;
use ts_rs::TS;

/// Pagination for long lists.
#[derive(Debug, Clone, Copy, Deserialize, TS)]
#[ts(export)]
pub struct Page {
    pub limit: u32,
    pub offset: u32,
}

impl Page {
    const MAX_LIMIT: u32 = 200;

    pub(crate) fn limit(self) -> u32 {
        self.limit.clamp(1, Self::MAX_LIMIT)
    }
}

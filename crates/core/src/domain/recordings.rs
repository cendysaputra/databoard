//! Screen recordings saved as files. The core only knows their shape and how to make a
//! safe file name; reading and writing the files is done by the desktop shell.

use serde::Serialize;
use ts_rs::TS;

use crate::error::{AppError, Result};

/// The longest name part of a recording file, in characters.
pub const MAX_STEM_LEN: usize = 80;
const EXTENSIONS: [&str; 2] = ["webm", "mp4"];

/// A recording file in the recordings folder.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct RecordingFile {
    pub file_name: String,
    /// Full path on disk, to show the user where the file is.
    pub path: String,
    /// Size in bytes (a float so it maps to a plain TypeScript number).
    pub size_bytes: f64,
    /// Last modification as seconds since the Unix epoch.
    pub modified_at: f64,
}

/// Whether recordings can be sent to Google Drive from this app, and to whose account.
#[derive(Debug, Clone, Default, Serialize, TS)]
#[ts(export)]
pub struct DriveStatus {
    /// False when the app was built without Google credentials (or outside the desktop app).
    pub configured: bool,
    /// True once the user has signed in and the app holds a token.
    pub connected: bool,
    /// Email of the connected Google account, when it could be read.
    pub account: Option<String>,
}

/// Builds a file name that is safe on Windows from what the user typed.
/// Only letters, digits, spaces, `-` and `_` are kept (so it also fits in an ASCII header).
pub fn file_name(name: &str, extension: &str) -> Result<String> {
    if !EXTENSIONS.contains(&extension) {
        return Err(AppError::validation("recordings must be .webm or .mp4"));
    }
    let stem: String = name
        .trim()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, ' ' | '-' | '_') {
                c
            } else {
                '-'
            }
        })
        .take(MAX_STEM_LEN)
        .collect();
    let stem = stem.trim_matches(|c| c == ' ' || c == '-');
    if stem.is_empty() {
        return Err(AppError::validation(
            "name needs at least one letter or digit",
        ));
    }
    Ok(format!("{stem}.{extension}"))
}

/// Whether `value` is a name produced by [`file_name`], i.e. safe to join to the folder.
pub fn is_safe_file_name(value: &str) -> bool {
    match value.rsplit_once('.') {
        Some((stem, extension)) => file_name(stem, extension).is_ok_and(|safe| safe == value),
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn makes_safe_names() {
        assert_eq!(
            file_name("  Demo: klien/A  ", "webm").unwrap(),
            "Demo- klien-A.webm"
        );
        assert!(file_name("???", "webm").is_err());
        assert!(file_name("demo", "exe").is_err());
    }

    #[test]
    fn rejects_paths_as_file_names() {
        assert!(is_safe_file_name("Rekaman 2026-11-14.webm"));
        assert!(!is_safe_file_name("../secret.webm"));
        assert!(!is_safe_file_name("a\\b.webm"));
        assert!(!is_safe_file_name("noext"));
    }
}

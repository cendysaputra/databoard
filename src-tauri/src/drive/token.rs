//! Where the Google refresh token lives: the operating system's credential store
//! (Windows Credential Manager), never the database or a plain file.

use dashboard_core::AppError;
use keyring::{Entry, Error};

use crate::error::CommandResult;

const SERVICE: &str = "com.cendi.databoard";
const ACCOUNT: &str = "google-drive-refresh-token";

fn entry() -> CommandResult<Entry> {
    Entry::new(SERVICE, ACCOUNT).map_err(AppError::external)
}

/// The stored token, or `None` when the user has not connected Drive.
pub fn load() -> CommandResult<Option<String>> {
    match entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(Error::NoEntry) => Ok(None),
        Err(err) => Err(AppError::external(err)),
    }
}

pub fn save(token: &str) -> CommandResult<()> {
    entry()?.set_password(token).map_err(AppError::external)
}

/// Forgets the token. Not having one is fine.
pub fn clear() -> CommandResult<()> {
    match entry()?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(err) => Err(AppError::external(err)),
    }
}

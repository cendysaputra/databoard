//! Image files of the app (project covers), kept in `media/` inside the app data directory
//! so they survive updates. The frontend resizes an image before sending it here.

use std::fs;
use std::path::PathBuf;

use dashboard_core::domain::media;
use dashboard_core::AppError;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager};

use crate::error::CommandResult;

const FOLDER: &str = "media";
const EXTENSION_HEADER: &str = "x-extension";
/// A resized cover is far smaller; anything bigger is not one.
const MAX_BYTES: usize = 8 * 1024 * 1024;

fn media_dir(app: &AppHandle) -> CommandResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| AppError::validation(err.to_string()))?
        .join(FOLDER);
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

/// Stores an image and returns its file name. The image is the raw request body;
/// its format comes in a header.
#[tauri::command(async)]
pub fn media_save(app: AppHandle, request: Request<'_>) -> CommandResult<String> {
    let extension = request
        .headers()
        .get(EXTENSION_HEADER)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    let name = media::new_file_name(extension)?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(AppError::validation("image must be raw bytes"));
    };
    if bytes.is_empty() || bytes.len() > MAX_BYTES {
        return Err(AppError::validation("image is empty or too large"));
    }
    fs::write(media_dir(&app)?.join(&name), bytes)?;
    Ok(name)
}

/// The bytes of a stored image.
#[tauri::command(async)]
pub fn media_read(app: AppHandle, name: String) -> CommandResult<Response> {
    if !media::is_safe_file_name(&name) {
        return Err(AppError::validation("invalid image name"));
    }
    let path = media_dir(&app)?.join(name);
    if !path.is_file() {
        return Err(AppError::NotFound("image"));
    }
    Ok(Response::new(fs::read(path)?))
}

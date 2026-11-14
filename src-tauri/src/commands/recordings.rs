//! Saving screen recordings to disk. The frontend records; these commands only write the
//! bytes into the recordings folder (`Videos\DataBoard`) and list what is there.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use dashboard_core::domain::recordings::{self, RecordingFile};
use dashboard_core::AppError;
use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, Manager};

use crate::error::CommandResult;

const FOLDER: &str = "DataBoard";
const FILE_HEADER: &str = "x-file-name";

/// `Videos\DataBoard`, or a folder in the app data directory when there is no Videos folder.
fn recordings_dir(app: &AppHandle) -> CommandResult<PathBuf> {
    let base = app
        .path()
        .video_dir()
        .or_else(|_| app.path().app_data_dir());
    let dir = base
        .map_err(|err| AppError::validation(err.to_string()))?
        .join(FOLDER);
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn describe(path: &Path) -> CommandResult<RecordingFile> {
    let meta = fs::metadata(path)?;
    let modified = meta
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok());
    Ok(RecordingFile {
        file_name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
        path: path.to_string_lossy().into_owned(),
        size_bytes: meta.len() as f64,
        modified_at: modified.map_or(0.0, |since| since.as_secs_f64()),
    })
}

/// Creates an empty file for a new recording and returns it. If the name is taken,
/// a number is added so nothing is overwritten.
#[tauri::command]
pub fn recordings_begin(
    app: AppHandle,
    name: String,
    extension: String,
) -> CommandResult<RecordingFile> {
    let dir = recordings_dir(&app)?;
    let wanted = recordings::file_name(&name, &extension)?;
    let (stem, _) = wanted.rsplit_once('.').unwrap_or((&wanted, ""));
    let mut path = dir.join(&wanted);
    let mut counter = 2;
    while path.exists() {
        path = dir.join(format!("{stem}-{counter}.{extension}"));
        counter += 1;
    }
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)?;
    describe(&path)
}

/// Appends one chunk to a recording started with `recordings_begin`.
/// The chunk is the raw request body; the file name comes in a header.
#[tauri::command]
pub fn recordings_append(app: AppHandle, request: Request<'_>) -> CommandResult<()> {
    let name = request
        .headers()
        .get(FILE_HEADER)
        .and_then(|value| value.to_str().ok())
        .filter(|name| recordings::is_safe_file_name(name))
        .ok_or_else(|| AppError::validation("missing or invalid recording file name"))?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(AppError::validation("recording chunk must be raw bytes"));
    };
    // The file must already exist: chunks can only go to a recording that was begun.
    let path = recordings_dir(&app)?.join(name);
    OpenOptions::new()
        .append(true)
        .open(path)?
        .write_all(bytes)?;
    Ok(())
}

/// Saved recordings, newest first.
#[tauri::command]
pub fn recordings_list(app: AppHandle) -> CommandResult<Vec<RecordingFile>> {
    let mut files: Vec<RecordingFile> = fs::read_dir(recordings_dir(&app)?)?
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(recordings::is_safe_file_name)
        })
        .filter_map(|path| describe(&path).ok())
        .collect();
    files.sort_by(|a, b| b.modified_at.total_cmp(&a.modified_at));
    Ok(files)
}

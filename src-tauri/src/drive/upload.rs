//! Talking to the Google Drive API: find or create the app's folder and upload a file
//! in pieces (a "resumable upload"), so large recordings never sit in memory.

use std::path::Path;

use dashboard_core::AppError;
use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE, LOCATION};
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use serde_json::json;
use tokio::fs::File;
use tokio::io::AsyncReadExt;

use crate::error::CommandResult;

const FILES_URL: &str = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL: &str = "https://www.googleapis.com/upload/drive/v3/files";
const ABOUT_URL: &str = "https://www.googleapis.com/drive/v3/about";
const FOLDER_NAME: &str = "DataBoard";
const FOLDER_MIME: &str = "application/vnd.google-apps.folder";
/// Drive wants pieces in multiples of 256 KiB; 8 MiB keeps memory low and requests few.
const CHUNK_BYTES: usize = 8 * 1024 * 1024;

#[derive(Deserialize)]
struct DriveFile {
    id: String,
    #[serde(rename = "webViewLink")]
    web_view_link: Option<String>,
}

#[derive(Deserialize)]
struct FileList {
    files: Vec<DriveFile>,
}

#[derive(Deserialize)]
struct About {
    user: AboutUser,
}

#[derive(Deserialize)]
struct AboutUser {
    #[serde(rename = "emailAddress")]
    email_address: Option<String>,
}

/// Turns a non-success response into an error that keeps Google's explanation.
async fn checked(response: reqwest::Response) -> CommandResult<reqwest::Response> {
    if response.status().is_success() {
        return Ok(response);
    }
    let status = response.status();
    let detail = response.text().await.unwrap_or_default();
    Err(AppError::external(format!(
        "Google Drive request failed ({status}): {detail}"
    )))
}

/// `Content-Range` for one piece of a file of `total` bytes.
fn content_range(start: u64, len: u64, total: u64) -> String {
    format!("bytes {start}-{}/{total}", start + len - 1)
}

/// The MIME type Drive should store for a recording file.
fn mime_for(file_name: &str) -> &'static str {
    if file_name.ends_with(".mp4") {
        "video/mp4"
    } else {
        "video/webm"
    }
}

/// Email of the signed-in account, if Google tells us.
pub async fn account_email(http: &Client, access: &str) -> Option<String> {
    let response = http
        .get(ABOUT_URL)
        .query(&[("fields", "user(emailAddress)")])
        .bearer_auth(access)
        .send()
        .await
        .ok()?;
    response.json::<About>().await.ok()?.user.email_address
}

/// Id of the app's folder in the user's Drive, creating it on first use.
async fn ensure_folder(http: &Client, access: &str) -> CommandResult<String> {
    let query =
        format!("name = '{FOLDER_NAME}' and mimeType = '{FOLDER_MIME}' and trashed = false");
    let found: FileList = checked(
        http.get(FILES_URL)
            .query(&[
                ("q", query.as_str()),
                ("fields", "files(id)"),
                ("spaces", "drive"),
            ])
            .bearer_auth(access)
            .send()
            .await
            .map_err(AppError::external)?,
    )
    .await?
    .json()
    .await
    .map_err(AppError::external)?;
    if let Some(folder) = found.files.into_iter().next() {
        return Ok(folder.id);
    }

    let created: DriveFile = checked(
        http.post(FILES_URL)
            .query(&[("fields", "id")])
            .bearer_auth(access)
            .json(&json!({ "name": FOLDER_NAME, "mimeType": FOLDER_MIME }))
            .send()
            .await
            .map_err(AppError::external)?,
    )
    .await?
    .json()
    .await
    .map_err(AppError::external)?;
    Ok(created.id)
}

/// Uploads the file into the app's Drive folder and returns a link to open it.
pub async fn upload_file(http: &Client, access: &str, path: &Path) -> CommandResult<String> {
    let file_name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let mut file = File::open(path).await?;
    let total = file.metadata().await?.len();
    if total == 0 {
        return Err(AppError::validation("the recording is empty"));
    }
    let folder = ensure_folder(http, access).await?;

    // Step 1: announce the upload; Google answers with the address to send the bytes to.
    let session = checked(
        http.post(UPLOAD_URL)
            .query(&[("uploadType", "resumable"), ("fields", "id,webViewLink")])
            .bearer_auth(access)
            .header("X-Upload-Content-Type", mime_for(&file_name))
            .header("X-Upload-Content-Length", total)
            .json(&json!({ "name": file_name, "parents": [folder] }))
            .send()
            .await
            .map_err(AppError::external)?,
    )
    .await?;
    let upload_url = session
        .headers()
        .get(LOCATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AppError::external("Google Drive did not return an upload address"))?
        .to_owned();

    // Step 2: send the file piece by piece.
    let mut sent = 0_u64;
    let mut buffer = vec![0_u8; CHUNK_BYTES];
    loop {
        let mut filled = 0;
        while filled < buffer.len() {
            match file.read(&mut buffer[filled..]).await? {
                0 => break,
                read => filled += read,
            }
        }
        if filled == 0 {
            return Err(AppError::external("the recording changed while uploading"));
        }
        let response = http
            .put(&upload_url)
            .header(CONTENT_LENGTH, filled)
            .header(CONTENT_RANGE, content_range(sent, filled as u64, total))
            .body(buffer[..filled].to_vec())
            .send()
            .await
            .map_err(AppError::external)?;
        sent += filled as u64;

        // 308 means "piece received, send the next one".
        if response.status() == StatusCode::PERMANENT_REDIRECT && sent < total {
            continue;
        }
        let uploaded: DriveFile = checked(response)
            .await?
            .json()
            .await
            .map_err(AppError::external)?;
        return Ok(uploaded
            .web_view_link
            .unwrap_or_else(|| format!("https://drive.google.com/file/d/{}/view", uploaded.id)));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_range_is_inclusive() {
        assert_eq!(content_range(0, 8, 20), "bytes 0-7/20");
        assert_eq!(content_range(16, 4, 20), "bytes 16-19/20");
    }

    #[test]
    fn mime_follows_the_extension() {
        assert_eq!(mime_for("a.mp4"), "video/mp4");
        assert_eq!(mime_for("a.webm"), "video/webm");
    }
}

//! Sending recordings to the user's Google Drive. All network traffic happens here in
//! Rust; the frontend only asks for status, sign-in, sign-out and an upload.

mod oauth;
mod token;
mod upload;

use dashboard_core::domain::recordings::{self, DriveStatus};
use dashboard_core::AppError;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tokio::net::TcpListener;

use crate::commands::recordings::recordings_dir;
use crate::error::CommandResult;

fn not_configured() -> AppError {
    AppError::validation("Google Drive is not set up in this build")
}

/// Whether Drive can be used, and with which account.
#[tauri::command]
pub async fn drive_status() -> CommandResult<DriveStatus> {
    let Some(client) = oauth::client() else {
        return Ok(DriveStatus::default());
    };
    let Some(refresh_token) = token::load()? else {
        return Ok(DriveStatus {
            configured: true,
            ..DriveStatus::default()
        });
    };
    // The account email is a nicety; being offline must not make the app look disconnected.
    let http = reqwest::Client::new();
    let account = match oauth::refresh(&http, &client, &refresh_token).await {
        Ok(access) => upload::account_email(&http, &access).await,
        Err(_) => None,
    };
    Ok(DriveStatus {
        configured: true,
        connected: true,
        account,
    })
}

/// Signs in with Google in the system browser and keeps the token for later uploads.
#[tauri::command]
pub async fn drive_connect(app: AppHandle) -> CommandResult<DriveStatus> {
    let client = oauth::client().ok_or_else(not_configured)?;

    // Google redirects back to this one-time local address.
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let redirect_uri = format!("http://127.0.0.1:{}", listener.local_addr()?.port());
    let pkce = oauth::pkce();
    let state = oauth::new_state();
    let url = oauth::auth_url(&client.id, &redirect_uri, &pkce.challenge, &state);
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(AppError::external)?;

    let code = oauth::wait_for_code(listener, &state).await?;
    let http = reqwest::Client::new();
    let (access, refresh_token) =
        oauth::exchange_code(&http, &client, &code, &pkce.verifier, &redirect_uri).await?;
    token::save(&refresh_token)?;

    let account = upload::account_email(&http, &access).await;
    Ok(DriveStatus {
        configured: true,
        connected: true,
        account,
    })
}

/// Forgets the Google account on this computer.
#[tauri::command]
pub fn drive_disconnect() -> CommandResult<()> {
    token::clear()
}

/// Uploads a saved recording to the "DataBoard" folder in Drive; returns a link to it.
#[tauri::command]
pub async fn drive_upload(app: AppHandle, file_name: String) -> CommandResult<String> {
    if !recordings::is_safe_file_name(&file_name) {
        return Err(AppError::validation("invalid recording file name"));
    }
    let client = oauth::client().ok_or_else(not_configured)?;
    let refresh_token =
        token::load()?.ok_or_else(|| AppError::validation("Google Drive is not connected yet"))?;
    let path = recordings_dir(&app)?.join(&file_name);

    let http = reqwest::Client::new();
    let access = oauth::refresh(&http, &client, &refresh_token).await?;
    upload::upload_file(&http, &access, &path).await
}

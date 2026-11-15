//! Reminder scheduler. It runs in the Rust process, so reminders arrive as system
//! notifications even while the window is closed to the tray.

use std::time::Duration;

use dashboard_core::domain::reminders;
use dashboard_core::{Db, Result};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

/// How often due reminders are looked for; a reminder is at most this late.
const TICK: Duration = Duration::from_secs(30);

/// Starts the loop. The first pass runs at once, which shows what came due while the app was closed.
pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticks = tokio::time::interval(TICK);
        loop {
            ticks.tick().await;
            if let Err(err) = notify_due(&app) {
                eprintln!("scheduler: {err}");
            }
        }
    });
}

/// Shows every due reminder once. One that could not be shown is tried again on the next pass.
fn notify_due(app: &AppHandle) -> Result<()> {
    let db = app.state::<Db>();
    let title = &app.package_info().name;
    for reminder in db.with(reminders::due)? {
        let shown = app
            .notification()
            .builder()
            .title(title)
            .body(&reminder.message)
            .show();
        match shown {
            Ok(()) => db.with(|conn| reminders::mark_notified(conn, &reminder.id))?,
            Err(err) => eprintln!("scheduler: notification failed: {err}"),
        }
    }
    Ok(())
}

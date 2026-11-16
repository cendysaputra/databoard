//! Reminder scheduler. It runs in the Rust process, so reminders arrive as system
//! notifications even while the window is closed to the tray.

use std::time::Duration;

use dashboard_core::db::backup_is_due;
use dashboard_core::domain::{reminders, settings};
use dashboard_core::{Db, Result};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

/// How often due reminders are looked for; a reminder is at most this late.
const TICK: Duration = Duration::from_secs(30);

/// The scheduled backup is looked at once in this many ticks (about hourly), and at start.
const BACKUP_EVERY_TICKS: u32 = 120;

/// A folder chosen in Settings gets a new backup when its newest one is this old.
const BACKUP_INTERVAL: Duration = Duration::from_secs(7 * 24 * 60 * 60);

/// Starts the loop. The first pass runs at once, which shows what came due while the app was closed.
pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticks = tokio::time::interval(TICK);
        let mut count: u32 = 0;
        loop {
            ticks.tick().await;
            let with_backup = count.is_multiple_of(BACKUP_EVERY_TICKS);
            count = count.wrapping_add(1);
            // Database work and the backup copy block, so they run off the async workers.
            let app = app.clone();
            let pass = tauri::async_runtime::spawn_blocking(move || {
                if let Err(err) = notify_due(&app) {
                    eprintln!("scheduler: {err}");
                }
                if with_backup {
                    if let Err(err) = backup_if_due(&app) {
                        eprintln!("scheduler: backup failed: {err}");
                    }
                }
            });
            if let Err(err) = pass.await {
                eprintln!("scheduler: {err}");
            }
        }
    });
}

/// Shows every due reminder once. It is recorded as shown first, so a failure can never
/// repeat a notification; the reminder still waits in the app's notification menu.
fn notify_due(app: &AppHandle) -> Result<()> {
    let db = app.state::<Db>();
    let title = &app.package_info().name;
    for reminder in db.with(reminders::due)? {
        db.with(|conn| reminders::mark_notified(conn, &reminder.id))?;
        let shown = app
            .notification()
            .builder()
            .title(title)
            .body(&reminder.message)
            .show();
        if let Err(err) = shown {
            eprintln!("scheduler: notification failed: {err}");
        }
    }
    Ok(())
}

/// The weekly backup. It only runs once the user has chosen a backup folder in Settings.
fn backup_if_due(app: &AppHandle) -> Result<()> {
    let db = app.state::<Db>();
    let Some(dir) = db.with(settings::get)?.backup_dir else {
        return Ok(());
    };
    let dir = std::path::Path::new(&dir);
    if backup_is_due(dir, BACKUP_INTERVAL) {
        db.backup_into(dir)?;
    }
    Ok(())
}

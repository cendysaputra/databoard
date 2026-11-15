//! Tauri shell. It only wires things together; business logic lives in `dashboard-core`.

mod commands;
mod drive;
mod error;
mod scheduler;
mod tray;

use dashboard_core::Db;
use tauri::{Manager, RunEvent};

pub fn run() {
    tauri::Builder::default()
        // Must be registered first: a second launch only brings the running app forward.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Err(err) = tray::show_main(app, None) {
                eprintln!("single instance: {err}");
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![tray::MINIMIZED_FLAG]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // %APPDATA%\<identifier>\ on Windows: survives updates and reinstalls.
            let data_dir = app.path().app_data_dir()?;
            let db = Db::open(&data_dir, &app.package_info().version.to_string())?;
            app.manage(db);

            tray::init(app.handle())?;
            scheduler::start(app.handle().clone());
            // Started by autostart: stay in the tray until the window is asked for.
            if !std::env::args().any(|arg| arg == tray::MINIMIZED_FLAG) {
                tray::show_main(app.handle(), None)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::autostart::autostart_get,
            commands::autostart::autostart_set,
            commands::collections::collections_list,
            commands::collections::collections_get,
            commands::collections::collections_create,
            commands::collections::collections_update,
            commands::collections::collections_remove,
            commands::entries::entries_list,
            commands::entries::entries_get,
            commands::entries::entries_create,
            commands::entries::entries_update,
            commands::entries::entries_remove,
            commands::events::events_list,
            commands::events::events_get,
            commands::events::events_create,
            commands::events::events_update,
            commands::events::events_remove,
            commands::reminders::reminders_list,
            commands::reminders::reminders_create,
            commands::reminders::reminders_complete,
            commands::reminders::reminders_remove,
            commands::notes::notes_list,
            commands::notes::notes_search,
            commands::notes::notes_get,
            commands::notes::notes_create,
            commands::notes::notes_update,
            commands::notes::notes_remove,
            commands::projects::projects_list,
            commands::projects::projects_get,
            commands::projects::projects_create,
            commands::projects::projects_update,
            commands::projects::projects_remove,
            commands::overview::overview_get,
            commands::mcp::mcp_server_path,
            commands::media::media_save,
            commands::media::media_read,
            commands::recordings::recordings_begin,
            commands::recordings::recordings_append,
            commands::recordings::recordings_list,
            drive::drive_status,
            drive::drive_connect,
            drive::drive_disconnect,
            drive::drive_upload,
            commands::tags::tags_list,
            commands::tags::tags_create,
            commands::tags::tags_update,
            commands::tags::tags_remove,
            commands::settings::settings_get,
            commands::settings::settings_update,
        ])
        .build(tauri::generate_context!())
        .expect("failed to start DataBoard")
        .run(|_app, event| {
            // Closing the last window destroys it but keeps the process (tray and scheduler)
            // running. Only an explicit quit, which carries an exit code, ends the app.
            if let RunEvent::ExitRequested { api, code, .. } = event {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
        });
}

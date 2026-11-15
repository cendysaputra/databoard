//! Tray icon and the main window's life cycle. Closing the window destroys it with its
//! WebView (low memory in the tray); it is rebuilt from the config when asked for.

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Label of the only window; must match `app.windows[0].label` in `tauri.conf.json`.
const MAIN: &str = "main";

/// Event that asks an open window to go to a page; the payload is the path.
const NAVIGATE: &str = "navigate";

const NEW_EVENT_PATH: &str = "/calendar/new";

/// Passed by autostart, so the app starts in the tray without opening its window.
pub const MINIMIZED_FLAG: &str = "--minimized";

/// Shows the main window, building it first when it was closed to the tray.
/// With `path`, the window opens on (or goes to) that page.
pub fn show_main(app: &AppHandle, path: Option<&str>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN) {
        window.unminimize()?;
        window.show()?;
        window.set_focus()?;
        if let Some(path) = path {
            app.emit_to(MAIN, NAVIGATE, path)?;
        }
        return Ok(());
    }
    let Some(config) = app.config().app.windows.first() else {
        return Ok(());
    };
    let mut config = config.clone();
    if let Some(path) = path {
        config.url = WebviewUrl::App(path.trim_start_matches('/').into());
    }
    WebviewWindowBuilder::from_config(app, &config)?.build()?;
    Ok(())
}

/// Adds the tray icon: a left click opens the window, the menu offers open, new event and quit.
pub fn init(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Buka DataBoard", true, None::<&str>)?;
    let new_event = MenuItem::with_id(app, "new-event", "Event baru", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Keluar", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &new_event, &quit])?;

    let mut tray = TrayIconBuilder::with_id(MAIN)
        .tooltip(&app.package_info().name)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let result = match event.id.as_ref() {
                "open" => show_main(app, None),
                "new-event" => show_main(app, Some(NEW_EVENT_PATH)),
                "quit" => {
                    app.exit(0);
                    Ok(())
                }
                _ => Ok(()),
            };
            if let Err(err) = result {
                eprintln!("tray: {err}");
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Err(err) = show_main(tray.app_handle(), None) {
                    eprintln!("tray: {err}");
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

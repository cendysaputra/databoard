use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use ts_rs::TS;

use crate::error::{AppError, Result};
use crate::util::{now, optional, required};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum Theme {
    System,
    Light,
    Dark,
}

/// App settings. Each field is one row in the `settings` table (key → JSON value),
/// so adding a field with a default needs no migration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(default)]
#[ts(export)]
pub struct Settings {
    pub app_name: String,
    /// Accent color as `#rrggbb`.
    pub accent_color: String,
    pub theme: Theme,
    /// How long before an event a new reminder fires by default.
    pub default_reminder_minutes: i32,
    pub backup_dir: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            app_name: "Dashboard".into(),
            accent_color: "#4f46e5".into(),
            theme: Theme::System,
            default_reminder_minutes: 10,
            backup_dir: None,
        }
    }
}

fn is_hex_color(value: &str) -> bool {
    value.len() == 7 && value.starts_with('#') && value[1..].bytes().all(|b| b.is_ascii_hexdigit())
}

/// Stored settings on top of the defaults. Unknown or malformed rows are ignored.
pub fn get(conn: &Connection) -> Result<Settings> {
    let mut stmt = conn.prepare_cached("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut merged = match serde_json::to_value(Settings::default())? {
        Value::Object(map) => map,
        _ => Map::new(),
    };
    for row in rows {
        let (key, raw) = row?;
        if let (true, Ok(value)) = (merged.contains_key(&key), serde_json::from_str(&raw)) {
            merged.insert(key, value);
        }
    }
    Ok(serde_json::from_value(Value::Object(merged)).unwrap_or_default())
}

/// Validates and stores all settings, then returns what is now saved.
pub fn update(conn: &Connection, input: &Settings) -> Result<Settings> {
    if !is_hex_color(&input.accent_color) {
        return Err(AppError::validation("accent_color must look like #rrggbb"));
    }
    if !(0..=10_080).contains(&input.default_reminder_minutes) {
        return Err(AppError::validation(
            "default_reminder_minutes must be within one week",
        ));
    }
    let cleaned = Settings {
        app_name: required("app_name", &input.app_name)?,
        accent_color: input.accent_color.to_ascii_lowercase(),
        backup_dir: optional(input.backup_dir.as_deref()),
        ..input.clone()
    };

    let now = now();
    if let Value::Object(map) = serde_json::to_value(&cleaned)? {
        let mut stmt = conn.prepare_cached(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        )?;
        for (key, value) in map {
            stmt.execute(params![key, value.to_string(), now])?;
        }
    }
    get(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Db;

    #[test]
    fn defaults_then_roundtrip() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            assert_eq!(get(c)?, Settings::default());

            let wanted = Settings {
                app_name: " Meja Kerja ".into(),
                accent_color: "#0EA5E9".into(),
                theme: Theme::Dark,
                default_reminder_minutes: 60,
                backup_dir: Some("D:\\Backup".into()),
            };
            let saved = update(c, &wanted)?;
            assert_eq!(saved.app_name, "Meja Kerja");
            assert_eq!(saved.accent_color, "#0ea5e9");
            assert_eq!(get(c)?, saved);

            let bad = Settings {
                accent_color: "red".into(),
                ..Settings::default()
            };
            assert!(update(c, &bad).is_err());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn ignores_malformed_rows() {
        let db = Db::open_in_memory().unwrap();
        db.with(|c| {
            c.execute("INSERT INTO settings VALUES ('theme', 'not json', 'x')", [])?;
            c.execute("INSERT INTO settings VALUES ('gone', '1', 'x')", [])?;
            assert_eq!(get(c)?, Settings::default());
            Ok(())
        })
        .unwrap();
    }
}

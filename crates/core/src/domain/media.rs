//! Names of the files in the app's `media/` directory, such as project covers.
//! The files themselves are written by the shell; the database only stores these names.

use crate::error::{AppError, Result};
use crate::util::new_id;

/// Image formats the app writes and shows.
const EXTENSIONS: [&str; 3] = ["webp", "jpg", "png"];

/// A fresh, unique file name with the given extension.
pub fn new_file_name(extension: &str) -> Result<String> {
    if !EXTENSIONS.contains(&extension) {
        return Err(AppError::validation("unsupported image format"));
    }
    Ok(format!("{}.{extension}", new_id()))
}

/// True for a name this module could have made: no folders, no dots but the extension's.
pub fn is_safe_file_name(name: &str) -> bool {
    name.rsplit_once('.').is_some_and(|(stem, extension)| {
        !stem.is_empty()
            && stem.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
            && EXTENSIONS.contains(&extension)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn makes_safe_names_and_rejects_paths() {
        let name = new_file_name("webp").unwrap();
        assert!(is_safe_file_name(&name));
        assert!(new_file_name("exe").is_err());

        for bad in [
            "../x.webp",
            "a/b.png",
            "x.exe",
            ".png",
            "a.b.png",
            "C:x.jpg",
        ] {
            assert!(!is_safe_file_name(bad), "{bad}");
        }
    }
}

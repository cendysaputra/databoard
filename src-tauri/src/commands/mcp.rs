use dashboard_core::AppError;

use crate::error::CommandResult;

/// File name of the MCP server; it is installed in the same folder as the app.
const MCP_SERVER: &str = "mcp-server.exe";

/// Full path of the MCP server, for the configuration snippets shown in Settings.
#[tauri::command(async)]
pub fn mcp_server_path() -> CommandResult<String> {
    let app = std::env::current_exe()?;
    let folder = app
        .parent()
        .ok_or_else(|| AppError::validation("the app has no folder"))?;
    Ok(folder.join(MCP_SERVER).to_string_lossy().into_owned())
}

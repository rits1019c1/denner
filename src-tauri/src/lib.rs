use std::fs;
use std::env;

#[tauri::command]
fn get_payload_path() -> String {
    let args: Vec<String> = env::args().collect();
    if let Some(pos) = args.iter().position(|x| x == "--payload-path") {
        if pos + 1 < args.len() {
            return args[pos + 1].clone();
        }
    }
    "".to_string()
}

#[tauri::command]
fn read_payload(path: String) -> Result<String, String> {
    if path.is_empty() { return Ok("{}".to_string()); }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![get_payload_path, read_payload])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

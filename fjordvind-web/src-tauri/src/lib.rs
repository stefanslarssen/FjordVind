use tauri::command;
use log::{info, error};

#[command]
fn test_connection() -> String {
    "Tauri fungerer!".to_string()
}

#[command]
async fn fetch_localities(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_http::reqwest;

    let url = "https://gis.fiskeridir.no/server/rest/services/Yggdrasil/Akvakulturregisteret/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&outSR=4326&resultRecordCount=5000";

    info!("Fetching localities from: {}", url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| {
            error!("Failed to create HTTP client: {}", e);
            format!("Kunne ikke opprette HTTP-klient: {}", e)
        })?;

    let response = client
        .get(url)
        .header("User-Agent", "FjordVind/1.0.0")
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| {
            error!("HTTP request failed: {}", e);
            format!("Nettverksfeil: {}", e)
        })?;

    let status = response.status();
    info!("Response status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        error!("HTTP error {}: {}", status, error_text);
        return Err(format!("HTTP-feil {}: {}", status, error_text));
    }

    let text = response
        .text()
        .await
        .map_err(|e| {
            error!("Failed to read response body: {}", e);
            format!("Kunne ikke lese respons: {}", e)
        })?;

    info!("Successfully fetched {} bytes of locality data", text.len());
    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![fetch_localities, test_connection])
    .setup(|app| {
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

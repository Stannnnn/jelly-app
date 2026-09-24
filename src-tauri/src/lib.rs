use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_window_state::Builder::new().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Setup initial responsive window sizing (only on first run)
      // The window-state plugin will restore position/size for subsequent runs
      let window = app.get_webview_window("main").unwrap();
      
      // Check if this is likely the first run by comparing current size to config defaults
      // If window-state plugin restored the window, the size will likely differ from config
      let config = app.config();
      let window_config = &config.app.windows[0];
      let config_width = window_config.width as f64;
      let config_height = window_config.height as f64;
      
      if let Ok(current_size) = window.inner_size() {
        let current_width = current_size.width as f64;
        let current_height = current_size.height as f64;
        
        // If current size matches config exactly, this is likely first run
        let is_likely_first_run = (current_width - config_width).abs() < 1.0 && 
                                  (current_height - config_height).abs() < 1.0;
        
        if is_likely_first_run {
          // Get monitor information
          if let Ok(monitor) = window.current_monitor() {
            if let Some(monitor) = monitor {
              let monitor_size = monitor.size();
              let scale_factor = monitor.scale_factor();
              
              let preferred_width: f64 = config_width;
              let preferred_height: f64 = config_height;
              let min_width: f64 = window_config.min_width.unwrap_or(380.0) as f64;
              let min_height: f64 = window_config.min_height.unwrap_or(624.0) as f64;
              
              // Calculate available space (leaving margin for taskbar/dock)
              let available_width = monitor_size.width as f64 * scale_factor * 0.68;
              let available_height = monitor_size.height as f64 * scale_factor * 0.8;
              
              // Determine optimal window size
              let optimal_width = preferred_width.min(available_width);
              let optimal_height = preferred_height.min(available_height);
              
              // Ensure we don't go below minimum size
              let final_width = optimal_width.max(min_width);
              let final_height = optimal_height.max(min_height);
              
              // Set the window size
              let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: final_width as u32,
                height: final_height as u32,
              }));
              
              // Only center if the final size is smaller than preferred size
              if final_width < preferred_width || final_height < preferred_height {
                let _ = window.center();
              }
            }
          }
        }
      }
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
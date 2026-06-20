//! ZeroClaw Studio — Tauri entry point.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    zeroclaw_studio_lib::run();
}

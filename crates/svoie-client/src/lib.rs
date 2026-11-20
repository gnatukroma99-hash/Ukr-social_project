pub mod storage;

#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
mod browser;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::{channel, RecvTimeoutError};
use std::sync::Mutex;
use std::time::{Duration, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use walkdir::WalkDir;

#[derive(Serialize)]
pub struct MdFile {
    /// Path relative to the vault root, always with forward slashes.
    rel: String,
    content: String,
    mtime: u64,
}

#[derive(Serialize)]
pub struct RawEntry {
    rel: String,
    size: u64,
    mtime: u64,
}

#[derive(Serialize)]
pub struct Scan {
    root: String,
    pages: Vec<MdFile>,
    /// Everything under `life/` — the app-owned zone (days, habits, quests, finance).
    life: Vec<MdFile>,
    /// Non-markdown files under `life/` (event photos), as vault-relative paths.
    media: Vec<String>,
    raw: Vec<RawEntry>,
    log: String,
    claude_md: String,
}

#[derive(Serialize)]
pub struct CmdResult {
    status: i32,
    stdout: String,
    stderr: String,
}

fn mtime_of(p: &Path) -> u64 {
    fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn rel_of(root: &Path, p: &Path) -> String {
    p.strip_prefix(root)
        .unwrap_or(p)
        .to_string_lossy()
        .replace('\\', "/")
}

fn is_hidden(entry: &walkdir::DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .map(|s| s.starts_with('.'))
        .unwrap_or(false)
}

fn md_files(root: &Path, dir: &Path, skip: &[&str]) -> Vec<MdFile> {
    let mut out = Vec::new();
    if !dir.is_dir() {
        return out;
    }
    for entry in WalkDir::new(dir)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
        .filter_map(Result::ok)
    {
        let p = entry.path();
        if !p.is_file() || p.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let rel = rel_of(root, p);
        if skip.contains(&rel.as_str()) {
            continue;
        }
        if let Ok(content) = fs::read_to_string(p) {
            out.push(MdFile { rel, content, mtime: mtime_of(p) });
        }
    }
    out
}

#[tauri::command]
fn scan_vault(root: String) -> Result<Scan, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.join("wiki").is_dir() {
        return Err(format!("No `wiki/` folder inside {root}"));
    }

    // log.md is handled separately.
    let pages = md_files(&root_path, &root_path.join("wiki"), &["wiki/log.md"]);
    let life = md_files(&root_path, &root_path.join("life"), &[]);
    let mut media: Vec<String> = Vec::new();
    for entry in WalkDir::new(root_path.join("life")).into_iter().filter_map(Result::ok) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("md")) == Some(true) {
            continue;
        }
        if path.file_name().and_then(|n| n.to_str()).map(|n| n.starts_with('.')) == Some(true) {
            continue;
        }
        if let Ok(rel) = path.strip_prefix(&root_path) {
            media.push(rel.to_string_lossy().replace('\\', "/"));
        }
    }
    media.sort();

    let mut raw = Vec::new();
    let raw_dir = root_path.join("raw");
    if raw_dir.is_dir() {
        for entry in WalkDir::new(&raw_dir)
            .into_iter()
            .filter_entry(|e| !is_hidden(e))
            .filter_map(Result::ok)
        {
            let p = entry.path();
            if !p.is_file() {
                continue;
            }
            let size = fs::metadata(p).map(|m| m.len()).unwrap_or(0);
            raw.push(RawEntry { rel: rel_of(&root_path, p), size, mtime: mtime_of(p) });
        }
    }

    let log = fs::read_to_string(root_path.join("wiki/log.md")).unwrap_or_default();
    let claude_md = fs::read_to_string(root_path.join("CLAUDE.md")).unwrap_or_default();

    Ok(Scan { root, pages, life, media, raw, log, claude_md })
}

/// Join `rel` under `root`, refusing anything that could escape the vault.
/// Works for paths that do not exist yet (no canonicalize), so writes can create files.
fn safe_join(root: &str, rel: &str) -> Result<PathBuf, String> {
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err("Path must be relative to the vault".into());
    }
    for c in rel_path.components() {
        match c {
            Component::Normal(_) => {}
            _ => return Err(format!("Path escapes vault: {rel}")),
        }
    }
    Ok(PathBuf::from(root).join(rel_path))
}

#[tauri::command]
fn read_text(root: String, rel: String) -> Result<String, String> {
    let target = safe_join(&root, &rel)?;
    fs::read_to_string(target).map_err(|e| e.to_string())
}

/// Write a whole file atomically (temp file + rename), creating parent folders.
/// The app only ever writes under `life/`, `wiki/log.md`, and frontmatter of
/// knowledge pages — the frontend enforces that; this command enforces the vault boundary.
#[tauri::command]
fn write_text(root: String, rel: String, content: String) -> Result<(), String> {
    let target = safe_join(&root, &rel)?;
    if rel.starts_with("raw/") || rel == "CLAUDE.md" {
        return Err(format!("Refusing to write to {rel}: not app-owned"));
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = target.with_extension("md.tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &target).map_err(|e| e.to_string())
}

/// Run a program inside the vault folder and wait for it. Used for `git` on
/// day close and for `claude -p` from the Claude panel. Finder-launched apps get
/// a bare PATH, so the usual tool locations are appended.
fn tool_path() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    let mut path = std::env::var("PATH").unwrap_or_default();
    for extra in [
        format!("{home}/.local/bin"),
        format!("{home}/.cargo/bin"),
        format!("{home}/.npm-global/bin"),
        "/opt/homebrew/bin".to_string(),
        "/usr/local/bin".to_string(),
    ] {
        if !path.split(':').any(|p| p == extra) {
            path.push(':');
            path.push_str(&extra);
        }
    }
    path
}

/// A child `claude` must not inherit the environment of a Claude Code session
/// that may have launched this app (nested-session guards, proxy base URL,
/// messaging tokens) — it should authenticate the way a terminal `claude` does.
fn clean_env(cmd: &mut Command) {
    for (k, _) in std::env::vars() {
        if k.starts_with("CLAUDE") || k == "ANTHROPIC_BASE_URL" {
            cmd.env_remove(k);
        }
    }
}

/// Write a binary file (an event photo) into the app-owned zone. Base64 in,
/// because the webview hands us bytes, not a path.
#[tauri::command]
fn write_binary(root: String, rel: String, base64_data: String) -> Result<(), String> {
    if !rel.starts_with("life/") {
        return Err(format!("Refusing to write {rel}"));
    }
    let target = safe_join(&root, &rel)?;
    let bytes = base64_decode(&base64_data)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&target, bytes).map_err(|e| e.to_string())
}

/// Rename a page inside the vault. Used when a person is renamed: the file
/// moves and the app rewrites every wikilink that pointed at it.
#[tauri::command]
fn rename_file(root: String, from: String, to: String) -> Result<(), String> {
    for rel in [&from, &to] {
        if rel.starts_with("raw/") || rel.as_str() == "CLAUDE.md" || !rel.ends_with(".md") {
            return Err(format!("Refusing to rename {rel}"));
        }
    }
    let src = safe_join(&root, &from)?;
    let dst = safe_join(&root, &to)?;
    if !src.is_file() {
        return Err(format!("{from} is not a file"));
    }
    // A case-only rename (Ivan -> ivan) is the same file on a case-insensitive
    // volume, so only refuse a target that is a *different* existing file.
    if dst.exists() && dst.canonicalize().ok() != src.canonicalize().ok() {
        return Err(format!("{to} already exists"));
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())
}

/// Delete a file the app owns (an event photo, or an event folder's markdown).
#[tauri::command]
fn delete_file(root: String, rel: String) -> Result<(), String> {
    if !rel.starts_with("life/") {
        return Err(format!("Refusing to delete {rel}"));
    }
    let target = safe_join(&root, &rel)?;
    if target.is_dir() {
        fs::remove_dir_all(target).map_err(|e| e.to_string())
    } else {
        fs::remove_file(target).map_err(|e| e.to_string())
    }
}

/// A person page Eldar no longer wants goes to the macOS Trash, never straight
/// to oblivion: `/usr/bin/trash` keeps it recoverable from Finder.
#[tauri::command]
fn trash_person(root: String, rel: String) -> Result<(), String> {
    let parts: Vec<&str> = rel.split('/').collect();
    let is_person = rel.ends_with(".md") && parts.len() == 4 && parts[0] == "wiki" && parts[2] == "People" && !parts[3].starts_with('_');
    if !is_person {
        return Err(format!("Refusing to trash {rel}: not a person page"));
    }
    let target = safe_join(&root, &rel)?;
    if !target.is_file() {
        return Err(format!("{rel} is not a file"));
    }
    let out = Command::new("/usr/bin/trash").arg(&target).output().map_err(|e| e.to_string())?;
    if out.status.success() { Ok(()) } else { Err(String::from_utf8_lossy(&out.stderr).trim().to_string()) }
}

fn base64_decode(data: &str) -> Result<Vec<u8>, String> {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut lookup = [255u8; 256];
    for (i, c) in TABLE.iter().enumerate() {
        lookup[*c as usize] = i as u8;
    }
    let mut out = Vec::with_capacity(data.len() / 4 * 3);
    let mut buf = 0u32;
    let mut bits = 0u32;
    for b in data.bytes() {
        if b == b'=' || b == b'\n' || b == b'\r' {
            continue;
        }
        let v = lookup[b as usize];
        if v == 255 {
            return Err("bad base64".into());
        }
        buf = (buf << 6) | v as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    Ok(out)
}

#[tauri::command]
fn run_cmd(root: String, program: String, args: Vec<String>) -> Result<CmdResult, String> {
    let mut cmd = Command::new(&program);
    cmd.args(&args).current_dir(&root).env("PATH", tool_path());
    clean_env(&mut cmd);
    let out = cmd.output().map_err(|e| format!("{program}: {e}"))?;
    Ok(CmdResult {
        status: out.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
    })
}

#[derive(Default)]
struct WatchState(Mutex<Option<RecommendedWatcher>>);

#[derive(Default)]
struct Runs(Mutex<HashMap<String, Child>>);

#[derive(Serialize, Clone)]
struct StreamLine {
    id: String,
    stream: String, // "out" | "err"
    line: String,
}

#[derive(Serialize, Clone)]
struct StreamExit {
    id: String,
    code: i32,
}

/// Spawn a program inside the vault and stream its output as `stream-line`
/// events, then `stream-exit`. Used by the Claude panel for `claude -p`.
#[tauri::command]
fn run_stream(app: AppHandle, state: State<Runs>, root: String, id: String, program: String, args: Vec<String>) -> Result<(), String> {
    let mut cmd = Command::new(&program);
    cmd.args(&args)
        .current_dir(&root)
        .env("PATH", tool_path())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    clean_env(&mut cmd);
    let mut child = cmd.spawn().map_err(|e| format!("{program}: {e}"))?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;
    for (reader, name) in [(Box::new(stdout) as Box<dyn std::io::Read + Send>, "out"), (Box::new(stderr), "err")] {
        let app = app.clone();
        let id = id.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(reader).lines().map_while(Result::ok) {
                let _ = app.emit("stream-line", StreamLine { id: id.clone(), stream: name.to_string(), line });
            }
        });
    }
    state.0.lock().map_err(|e| e.to_string())?.insert(id.clone(), child);
    let app2 = app.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_millis(150));
            let code = {
                let st = app2.state::<Runs>();
                let mut map = match st.0.lock() { Ok(m) => m, Err(_) => break };
                match map.get_mut(&id) {
                    Some(child) => match child.try_wait() {
                        Ok(Some(status)) => { map.remove(&id); Some(status.code().unwrap_or(-1)) }
                        Ok(None) => None,
                        Err(_) => { map.remove(&id); Some(-1) }
                    },
                    None => Some(-2), // killed
                }
            };
            if let Some(code) = code {
                // Give the reader threads a moment to flush the last lines.
                std::thread::sleep(Duration::from_millis(200));
                let _ = app2.emit("stream-exit", StreamExit { id: id.clone(), code });
                break;
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn kill_stream(state: State<Runs>, id: String) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = map.remove(&id) {
        let _ = child.kill();
    }
    Ok(())
}

/// Watch the vault root and emit `vault-changed` (debounced) when a markdown
/// file under `wiki/` or `life/` changes — whoever changed it: this app,
/// Claude Code, or Obsidian.
#[tauri::command]
fn watch_vault(app: AppHandle, state: State<WatchState>, root: String) -> Result<(), String> {
    let (tx, rx) = channel::<notify::Result<notify::Event>>();
    let mut watcher = notify::recommended_watcher(tx).map_err(|e| e.to_string())?;
    let root_path = PathBuf::from(&root);
    watcher
        .watch(&root_path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Replace any previous watcher (drops it, which stops it).
    *state.0.lock().unwrap() = Some(watcher);

    std::thread::spawn(move || {
        // Trailing debounce: collect changed paths until 400ms of quiet, then
        // emit them once, so the frontend can skip its own writes.
        let mut pending: Vec<String> = Vec::new();
        loop {
            let ev = if pending.is_empty() {
                match rx.recv() { Ok(ev) => Some(ev), Err(_) => break }
            } else {
                match rx.recv_timeout(Duration::from_millis(400)) {
                    Ok(ev) => Some(ev),
                    Err(RecvTimeoutError::Timeout) => None,
                    Err(RecvTimeoutError::Disconnected) => break,
                }
            };
            match ev {
                Some(Ok(ev)) => {
                    for p in &ev.paths {
                        let is_md = p.extension().and_then(|e| e.to_str()) == Some("md");
                        let rel = rel_of(&root_path, p);
                        if is_md && (rel.starts_with("wiki/") || rel.starts_with("life/")) && !pending.contains(&rel) {
                            pending.push(rel);
                        }
                    }
                }
                Some(Err(_)) => {}
                None => {
                    let _ = app.emit("vault-changed", std::mem::take(&mut pending));
                }
            }
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WatchState::default())
        .manage(Runs::default())
        .invoke_handler(tauri::generate_handler![scan_vault, read_text, write_text, write_binary, delete_file, rename_file, trash_person, run_cmd, run_stream, kill_stream, watch_vault])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

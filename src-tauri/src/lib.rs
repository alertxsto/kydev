use serde::Serialize;
use std::process::Command;
use sysinfo::{Disks, System};
use std::collections::HashMap;

// ── Types ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct SystemInfo {
    pub os: String, pub kernel: String, pub hostname: String, pub cpu: String,
    pub memory_used: String, pub memory_total: String, pub memory_pct: f64,
    pub disk_used: String, pub disk_total: String, pub disk_pct: f64,
    pub uptime: String, pub packages: u32, pub shell: String, pub de: String,
}

#[derive(Serialize)]
pub struct UpdateInfo { pub count: u32, pub has_updates: bool }

#[derive(Serialize)]
pub struct UpdatePreview { pub name: String, pub old_version: String, pub new_version: String, pub repo: String }

#[derive(Serialize)]
pub struct ContainerInfo { pub id: String, pub image: String, pub status: String, pub ports: String, pub name: String }

#[derive(Serialize)]
pub struct HistoryEntry { pub id: String, pub command: String, pub date: String, pub action: String }

#[derive(Serialize)]
pub struct Project { pub name: String, pub path: String, pub lang: String, pub framework: String, pub git_branch: String, pub git_dirty: bool, pub scripts: Vec<String> }

#[derive(Serialize)]
pub struct PortEntry { pub port: u16, pub process: String, pub pid: u32 }

#[derive(Serialize)]
pub struct PackageInfo { pub name: String, pub summary: String, pub version: String, pub repo: String, pub arch: String, pub size: String, pub installed: bool }

#[derive(Serialize)]
pub struct ConfigEntry { pub name: String, pub path: String, pub category: String }

// ── Git Types ─────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct GitStatusFile { pub path: String, pub status: String, pub staged: bool }

#[derive(Serialize)]
pub struct GitLogEntry { pub hash: String, pub author: String, pub message: String, pub date: String }

#[derive(Serialize)]
pub struct GitBranchInfo { pub name: String, pub current: bool, pub remote: String }

// ── Helpers ───────────────────────────────────────────────────────────

fn run_cmd(cmd: &str, args: &[&str]) -> String {
    Command::new(cmd).args(args).output().map(|o| {
        let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
        if s.is_empty() { String::from_utf8_lossy(&o.stderr).trim().to_string() } else { s }
    }).unwrap_or_default()
}

fn run_cmd_lines(cmd: &str, args: &[&str]) -> Vec<String> {
    run_cmd(cmd, args).lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect()
}

async fn run_async_cmd(cmd: &str, args: &[&str]) -> Result<String, String> {
    match tokio::process::Command::new(cmd).args(args).output().await {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).trim().to_string();
            if o.status.success() {
                Ok(if stdout.is_empty() { stderr } else { stdout })
            } else {
                Err(if stderr.is_empty() { stdout } else { stderr })
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

async fn run_async_cmd_lines(cmd: &str, args: &[&str]) -> Result<Vec<String>, String> {
    let out = run_async_cmd(cmd, args).await?;
    Ok(out.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect())
}

fn fmt_bytes(bytes: u64) -> String { format!("{:.1} GB", bytes as f64 / 1_073_741_824.0) }

fn fmt_seconds(secs: u64) -> String {
    let h = secs / 3600; let m = (secs % 3600) / 60;
    if h > 0 { format!("{}h {}m", h, m) } else { format!("{}m", m) }
}

/// Per-user app data (snippets, notes, tunnel/update logs).
fn kydev_data_dir() -> Result<std::path::PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let dir = std::path::PathBuf::from(home).join(".local/share/kydev");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn sh_single_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

fn is_safe_systemd_unit(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 240
        && !name.contains("..")
        && name.chars().all(|c| {
            c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | '@' | ':')
        })
}

/// Safe token for `dnf install -y <name>` fallback (avoids shell injection from UI).
fn is_safe_dnf_atom(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 120
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | '+'))
}

// ── Existing Commands (Enhanced) ───────────────────────────────────────

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all(); sys.refresh_all();
    let cpu = format!("{} ({} cores)", sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_default(), sys.physical_core_count().unwrap_or(0));
    let mem_total = sys.total_memory(); let mem_used = sys.used_memory();
    let mem_pct = if mem_total > 0 { (mem_used as f64 / mem_total as f64) * 100.0 } else { 0.0 };
    let disks = Disks::new_with_refreshed_list();
    let root = disks.iter().find(|d| d.mount_point() == std::path::Path::new("/"));
    let (disk_used, disk_total, disk_pct) = match root {
        Some(d) => {
            let total = d.total_space(); let avail = d.available_space(); let used = total - avail;
            let pct = if total > 0 { (used as f64 / total as f64) * 100.0 } else { 0.0 };
            (fmt_bytes(used), fmt_bytes(total), pct)
        }
        None => ("N/A".into(), "N/A".into(), 0.0),
    };
    SystemInfo {
        os: run_cmd("sh", &["-c", "grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '\"'"]),
        kernel: run_cmd("uname", &["-r"]), hostname: run_cmd("uname", &["-n"]), cpu,
        memory_used: fmt_bytes(mem_used), memory_total: fmt_bytes(mem_total), memory_pct: (mem_pct * 10.0).round() / 10.0,
        disk_used, disk_total, disk_pct: (disk_pct * 10.0).round() / 10.0,
        uptime: fmt_seconds(System::uptime()), packages: run_cmd_lines("rpm", &["-qa"]).len() as u32,
        shell: run_cmd("basename", &[&run_cmd("echo", &["$SHELL"])]), de: run_cmd("sh", &["-c", "echo $XDG_CURRENT_DESKTOP"]),
    }
}

#[tauri::command]
async fn check_updates() -> UpdateInfo {
    let output = run_async_cmd("sh", &["-c", "dnf check-update -q 2>/dev/null | grep -v '^$' | grep -v 'Security' | wc -l"]).await.unwrap_or_default();
    let count = output.trim().parse::<u32>().unwrap_or(0);
    UpdateInfo { count, has_updates: count > 0 }
}

#[tauri::command]
async fn preview_updates() -> Vec<UpdatePreview> {
    let mut previews = Vec::new();
    if let Ok(lines) = run_async_cmd_lines("sh", &["-c", "dnf check-update -q 2>/dev/null | grep -v '^$' | grep -v 'Security'"]).await {
        for line in lines {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                previews.push(UpdatePreview { name: parts[0].to_string(), old_version: "current".into(), new_version: parts[1].to_string(), repo: parts[2].to_string() });
            }
        }
    }
    previews
}

#[tauri::command]
async fn run_update() -> Result<String, String> { 
    run_async_cmd("pkexec", &["dnf", "upgrade", "-y"]).await
}

#[tauri::command]
async fn run_cleanup() -> Result<String, String> {
    let auto = run_async_cmd("pkexec", &["dnf", "autoremove", "-y"]).await.unwrap_or_default();
    let clean = run_async_cmd("pkexec", &["dnf", "clean", "all"]).await.unwrap_or_default();
    Ok(format!("{}\n---\n{}", auto, clean))
}

#[tauri::command]
async fn get_dnf_history() -> Vec<HistoryEntry> {
    let mut history = Vec::new();
    if let Ok(lines) = run_async_cmd_lines("sh", &["-c", "dnf history list 2>/dev/null | tail -n +4 | head -n 30"]).await {
        for line in lines {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                history.push(HistoryEntry {
                    id: parts[0].trim().to_string(),
                    command: parts[1].trim().to_string(),
                    date: parts[2].trim().to_string(),
                    action: parts[3].trim().to_string(),
                });
            }
        }
    }
    history
}

#[tauri::command]
async fn scan_projects(dir: String) -> Vec<Project> {
    let mut projects = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() { continue; }
            let name = entry.file_name().to_string_lossy().to_string();
            let path_str = path.to_string_lossy().to_string();
            let mut lang = String::new(); let mut framework = String::new(); let mut scripts = Vec::new();

            if path.join("package.json").exists() {
                lang = "JavaScript".into();
                if let Ok(content) = std::fs::read_to_string(path.join("package.json")) {
                    if content.contains("\"next\"") || content.contains("next/dist") { framework = "Next.js".into(); }
                    else if content.contains("\"react\"") || content.contains("react-dom") { framework = "React".into(); }
                    else if content.contains("\"vue\"") { framework = "Vue".into(); }
                    else if content.contains("\"svelte\"") { framework = "Svelte".into(); }
                    else { framework = "Node.js".into(); }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(s) = json.get("scripts").and_then(|s| s.as_object()) { scripts = s.keys().map(|k| k.to_string()).collect(); }
                    }
                }
            } else if path.join("Cargo.toml").exists() {
                lang = "Rust".into();
                if let Ok(content) = std::fs::read_to_string(path.join("Cargo.toml")) {
                    if content.contains("axum") { framework = "Axum".into(); } else if content.contains("actix") { framework = "Actix".into(); } else if content.contains("tauri") { framework = "Tauri".into(); } else { framework = "Binary".into(); }
                }
                scripts = vec!["build".into(), "run".into(), "test".into()];
            } else if path.join("go.mod").exists() { lang = "Go".into(); framework = "Go".into(); scripts = vec!["build".into(), "run .".into(), "test ./...".into()]; }
            else if path.join("pyproject.toml").exists() || path.join("requirements.txt").exists() { lang = "Python".into(); framework = "Python".into(); }

            if !lang.is_empty() {
                let git_branch = run_cmd("git", &["-C", &path_str, "branch", "--show-current"]);
                let git_status = run_cmd("git", &["-C", &path_str, "status", "--porcelain"]);
                let git_dirty = !git_status.trim().is_empty() && git_status != "fatal: not a git repository (or any of the parent directories): .git";
                projects.push(Project { name, path: path_str, lang, framework, git_branch, git_dirty, scripts });
            }
        }
    }
    projects.sort_by(|a, b| b.path.cmp(&a.path));
    projects
}

#[tauri::command]
async fn run_project_script(path: String, script: String, lang: String) -> Result<String, String> {
    let (prog, args) = match lang.as_str() {
        "JavaScript" => ("npm", vec!["run", &script]),
        "Rust" => ("cargo", vec![&script[..]]),
        "Go" => ("go", vec![&script[..]]),
        _ => return Err("Unknown language".into()),
    };
    match tokio::process::Command::new(prog).current_dir(path).args(args).output().await {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            if o.status.success() { Ok(if stdout.is_empty() { stderr } else { stdout }) } else { Err(stderr) }
        }
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
async fn scaffold_project(name: String, path: String, template: String, addons: Vec<String>) -> String {
    let target = format!("{}/{}", path, name);
    let mut cmd = match template.as_str() {
        "nextjs" => format!("cd {} && npx -y create-next-app@latest {} --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --use-npm", path, name),
        "vite-react" => format!("cd {} && npx -y create-vite@latest {} --template react-ts", path, name),
        "rust" => format!("cd {} && cargo new {}", path, name),
        "go" => format!("mkdir -p {} && cd {} && go mod init {}", target, target, name),
        "python" => format!("mkdir -p {} && cd {} && python3 -m venv venv && echo 'print(\"Hello World\")' > main.py", target, target),
        _ => return "Unknown template".into(),
    };

    let mut addon_cmds = Vec::new();
    if addons.contains(&"prisma".to_string()) { addon_cmds.push("npm install prisma --save-dev && npx prisma init"); }
    if addons.contains(&"zustand".to_string()) { addon_cmds.push("npm install zustand"); }
    
    if !addon_cmds.is_empty() && (template == "nextjs" || template == "vite-react") {
        cmd = format!("{} && cd {} && {}", cmd, target, addon_cmds.join(" && "));
    }

    run_cmd("sh", &["-c", &format!("{} 2>&1", cmd)])
}

#[tauri::command]
async fn open_in_editor(path: String, editor: String) -> Result<String, String> { 
    match tokio::process::Command::new(&editor).arg(&path).spawn() {
        Ok(_) => Ok("Opened".into()),
        Err(e) => Err(e.to_string())
    }
}

// ── Git GUI Commands ──────────────────────────────────────────────────

fn is_git_repo(path: &str) -> bool {
    let out = run_cmd("git", &["-C", path, "rev-parse", "--git-dir"]);
    !out.is_empty() && !out.contains("fatal")
}

#[tauri::command]
async fn git_current_branch(path: String) -> Result<String, String> {
    let branch = run_cmd("git", &["-C", &path, "branch", "--show-current"]);
    if branch.is_empty() || branch.contains("fatal") {
        return Err("Not a git repository".into());
    }
    Ok(branch)
}

#[tauri::command]
async fn git_status(path: String) -> Result<Vec<GitStatusFile>, String> {
    if !is_git_repo(&path) { return Err("Not a git repository".into()); }
    let output = run_cmd("git", &["-C", &path, "status", "--porcelain"]);
    let mut files = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() { continue; }
        let (status_part, file_part) = if line.starts_with("??") {
            ("??", &line[2..])
        } else if line.starts_with("!!") {
            continue;
        } else if line.len() >= 2 {
            (&line[0..2], &line[2..])
        } else {
            continue;
        };
        let file_path = file_part.trim();
        let bs = status_part.as_bytes();
        let x = bs[0] as char;
        let y = bs[1] as char;
        if status_part == "??" {
            files.push(GitStatusFile { path: file_path.into(), status: "?".into(), staged: false });
        } else {
            if x != ' ' {
                files.push(GitStatusFile { path: file_path.into(), status: x.to_string(), staged: true });
            }
            if y != ' ' {
                files.push(GitStatusFile { path: file_path.into(), status: y.to_string(), staged: false });
            }
        }
    }
    Ok(files)
}

#[tauri::command]
async fn git_diff(path: String, file: String, staged: bool) -> Result<String, String> {
    let out = if staged {
        run_cmd("git", &["-C", &path, "diff", "--cached", "--", &file])
    } else {
        run_cmd("git", &["-C", &path, "diff", "--", &file])
    };
    if out.contains("fatal") { Err(out) } else { Ok(out) }
}

#[tauri::command]
async fn git_stage(path: String, files: Vec<String>) -> Result<String, String> {
    let out = if files.is_empty() {
        run_cmd("git", &["-C", &path, "add", "-A"])
    } else {
        let mut args = vec!["-C", &path, "add", "--"];
        for f in &files { args.push(f); }
        run_cmd("git", &args)
    };
    if out.contains("fatal") || out.contains("error:") { Err(out) } else { Ok(out) }
}

#[tauri::command]
async fn git_unstage(path: String, files: Vec<String>) -> Result<String, String> {
    let out = if files.is_empty() {
        run_cmd("git", &["-C", &path, "restore", "--staged", "."])
    } else {
        let mut args = vec!["-C", &path, "restore", "--staged", "--"];
        for f in &files { args.push(f); }
        run_cmd("git", &args)
    };
    if out.contains("fatal") { Err(out) } else { Ok(out) }
}

#[tauri::command]
async fn git_commit(path: String, message: String) -> Result<String, String> {
    let out = run_cmd("sh", &["-c", &format!("git -C '{}' commit -m '{}' 2>&1", path.replace('\'', "'\\''"), message.replace('\'', "'\\''"))]);
    if out.contains("fatal") || out.contains("error:") { Err(out) } else { Ok(out) }
}

#[tauri::command]
async fn git_push(path: String) -> Result<String, String> {
    let out = run_cmd("git", &["-C", &path, "push"]);
    if out.is_empty() { Ok("Everything up-to-date".into()) }
    else if out.contains("fatal") { Err(out) } else { Ok(out) }
}

#[tauri::command]
async fn git_pull(path: String) -> Result<String, String> {
    let out = run_cmd("git", &["-C", &path, "pull"]);
    if out.contains("fatal") { Err(out) } else { Ok(out) }
}

#[tauri::command]
async fn git_log(path: String, limit: u32) -> Result<Vec<GitLogEntry>, String> {
    let output = run_cmd("git", &["-C", &path, "log", &format!("--max-count={}", limit), "--format=%H|%an|%s|%ar", "--no-color"]);
    if output.contains("fatal") { return Err("Not a git repository".into()); }
    let mut entries = Vec::new();
    for line in output.lines() {
        let parts: Vec<&str> = line.splitn(4, '|').collect();
        if parts.len() == 4 {
            entries.push(GitLogEntry { hash: parts[0][..7.min(parts[0].len())].into(), author: parts[1].into(), message: parts[2].into(), date: parts[3].into() });
        }
    }
    Ok(entries)
}

#[tauri::command]
async fn git_branches(path: String) -> Result<Vec<GitBranchInfo>, String> {
    let output = run_cmd("git", &["-C", &path, "branch", "-a", "--no-color"]);
    if output.contains("fatal") { return Err("Not a git repository".into()); }
    let mut branches = Vec::new();
    for line in output.lines() {
        let name = line.trim().trim_start_matches('*').trim();
        if name.is_empty() { continue; }
        let current = line.trim().starts_with('*');
        let remote = if name.contains('/') { name.splitn(2, '/').next().unwrap_or("").into() } else { String::new() };
        branches.push(GitBranchInfo { name: name.into(), current, remote });
    }
    Ok(branches)
}

#[tauri::command]
async fn git_checkout(path: String, branch: String) -> Result<String, String> {
    let out = run_cmd("git", &["-C", &path, "checkout", &branch]);
    if out.contains("fatal") || out.contains("error:") { Err(out) } else { Ok(out) }
}

#[tauri::command]
fn list_ports() -> Vec<PortEntry> {
    let mut ports = Vec::new();
    let lines = run_cmd_lines("sh", &["-c", "ss -tlnp 2>/dev/null | tail -n +2"]);
    for line in &lines {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 { continue; }
        let port = parts[3].rsplit(':').next().unwrap_or("0").parse::<u16>().unwrap_or(0);
        let process = if parts.len() > 5 { parts[5].trim_start_matches("users:((").trim_end_matches(')').to_string() } else { String::new() };
        let pid = if process.contains(',') { process.split(',').nth(1).unwrap_or("0").trim().parse::<u32>().unwrap_or(0) } else { 0 };
        ports.push(PortEntry { port, process, pid });
    }
    ports
}

#[tauri::command]
async fn kill_process(pid: u32) -> String { run_cmd("kill", &["-9", &pid.to_string()]) }

// ── Package Search & Details ──────────────────────────────────────────

#[tauri::command]
async fn search_packages(query: String) -> Vec<PackageInfo> {
    let mut packages = Vec::new();
    if let Ok(lines) = run_async_cmd_lines("dnf", &["search", "-q", "--cacheonly", &query]).await {
        for line in &lines {
            if let Some((name, summary)) = line.split_once(" : ") {
                packages.push(PackageInfo {
                    name: name.trim().split('.').next().unwrap_or(name.trim()).to_string(),
                    summary: summary.trim().to_string(), version: "".into(), repo: "".into(), arch: "".into(), size: "".into(), installed: false,
                });
            }
        }
    }
    packages.truncate(30); packages
}

#[tauri::command]
async fn get_package_details(name: String) -> PackageInfo {
    let mut pkg = PackageInfo { name: name.clone(), summary: "".into(), version: "".into(), repo: "".into(), arch: "".into(), size: "".into(), installed: false };
    if let Ok(info_lines) = run_async_cmd_lines("dnf", &["info", "-q", &name]).await {
        for line in info_lines {
            if line.starts_with("Installed Packages") { pkg.installed = true; }
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() == 2 {
                let k = parts[0].trim(); let v = parts[1].trim();
                match k { "Version" => pkg.version = v.into(), "Architecture" => pkg.arch = v.into(), "Size" => pkg.size = v.into(), "Repository" | "From repo" => pkg.repo = v.into(), "Summary" => pkg.summary = v.into(), _ => {} }
            }
        }
    }
    pkg
}

#[tauri::command]
async fn install_package(name: String) -> Result<String, String> { 
    run_async_cmd("pkexec", &["dnf", "install", "-y", &name]).await
}

#[tauri::command]
async fn remove_package(name: String) -> Result<String, String> { 
    run_async_cmd("pkexec", &["dnf", "remove", "-y", &name]).await
}

// ── Docker Commands ───────────────────────────────────────────────────

#[tauri::command]
async fn get_containers() -> Vec<ContainerInfo> {
    let mut containers = Vec::new();
    if let Ok(lines) = run_async_cmd_lines("sh", &["-c", "docker ps -a --format '{{.ID}}|{{.Image}}|{{.Status}}|{{.Ports}}|{{.Names}}' 2>/dev/null"]).await {
        for line in lines {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 5 {
                containers.push(ContainerInfo {
                    id: parts[0].to_string(), image: parts[1].to_string(), status: parts[2].to_string(), ports: parts[3].to_string(), name: parts[4].to_string(),
                });
            }
        }
    }
    containers
}

#[tauri::command]
async fn run_docker_compose(path: String, action: String) -> Result<String, String> {
    let res = tokio::process::Command::new("docker")
        .current_dir(&path).arg("compose").arg(&action).output().await;
    match res {
        Ok(o) => {
            if o.status.success() { Ok(String::from_utf8_lossy(&o.stdout).to_string()) }
            else { Err(String::from_utf8_lossy(&o.stderr).to_string()) }
        }
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
async fn run_docker_action(id: String, action: String) -> Result<String, String> {
    run_async_cmd("docker", &[&action, &id]).await
}

#[tauri::command]
async fn write_compose_file(path: String, content: String) -> String {
    match std::fs::write(&path, content) {
        Ok(_) => "OK".into(),
        Err(e) => format!("Error: {}", e),
    }
}

// ── API Tester ────────────────────────────────────────────────────────

#[derive(Serialize)]
struct HttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

#[tauri::command]
async fn send_http_request(method: String, url: String, body: String, headers: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut req = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => return Err("Invalid method".into()),
    };
    
    for line in headers.lines() {
        if let Some((k, v)) = line.split_once(':') {
            req = req.header(k.trim(), v.trim());
        }
    }
    
    if !body.is_empty() && method != "GET" {
        req = req.body(body);
    }
    
    match req.send().await {
        Ok(res) => {
            let status = res.status().as_u16();
            let mut headers_map = HashMap::new();
            for (k, v) in res.headers().iter() {
                headers_map.insert(k.as_str().to_string(), v.to_str().unwrap_or("").to_string());
            }
            let body_text = res.text().await.unwrap_or_default();
            
            let response = HttpResponse {
                status,
                headers: headers_map,
                body: body_text,
            };
            Ok(serde_json::to_string(&response).unwrap_or_default())
        }
        Err(e) => Err(e.to_string()),
    }
}

// ── Localhost Tunneling ───────────────────────────────────────────────

#[tauri::command]
async fn start_tunnel(port: u16) -> String {
    let log_path = match kydev_data_dir() {
        Ok(dir) => dir.join("tunnel.log"),
        Err(e) => return format!("Error: {}", e),
    };
    let q = sh_single_quote(&log_path.to_string_lossy());
    run_cmd(
        "sh",
        &["-c", &format!("npx localtunnel --port {} > {} 2>&1 & echo $!", port, q)],
    )
}

#[tauri::command]
async fn get_tunnel_log() -> String {
    match kydev_data_dir() {
        Ok(dir) => std::fs::read_to_string(dir.join("tunnel.log")).unwrap_or_default(),
        Err(_) => String::new(),
    }
}

#[tauri::command]
async fn stop_tunnel(pid: String) -> String {
    run_cmd("kill", &["-9", &pid])
}

// ── Local DB Studio & System Services ───────────────────────────────────

#[tauri::command]
fn check_service(name: String) -> bool {
    if !is_safe_systemd_unit(&name) {
        return false;
    }
    Command::new("systemctl")
        .args(["is-active", &name])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "active")
        .unwrap_or(false)
}

#[tauri::command]
async fn start_service(name: String) -> String {
    if !is_safe_systemd_unit(&name) {
        return "Invalid service name".into();
    }
    match tokio::process::Command::new("pkexec")
        .args(["systemctl", "start", &name])
        .output()
        .await
    {
        Ok(o) => {
            let out = String::from_utf8_lossy(&o.stdout).trim().to_string();
            let err = String::from_utf8_lossy(&o.stderr).trim().to_string();
            if o.status.success() {
                if out.is_empty() { err } else { out }
            } else if err.is_empty() {
                out
            } else {
                err
            }
        }
        Err(e) => e.to_string(),
    }
}

#[tauri::command]
async fn run_db_query(db_type: String, conn_str: String, query: String, use_root: bool) -> String {
    let cmd = match db_type.as_str() {
        "postgres" => {
            if use_root {
                format!("pkexec runuser -u postgres -- psql {} -c \"{}\"", conn_str, query.replace("\"", "\\\""))
            } else {
                format!("psql {} -c \"{}\"", conn_str, query.replace("\"", "\\\""))
            }
        },
        "mysql" => {
            if use_root {
                format!("pkexec mariadb {} -e \"{}\"", conn_str, query.replace("\"", "\\\""))
            } else {
                format!("mariadb {} -e \"{}\"", conn_str, query.replace("\"", "\\\""))
            }
        },
        "redis" => format!("redis-cli {} {}", conn_str, query),
        _ => return "Unsupported DB".into(),
    };
    run_cmd("sh", &["-c", &format!("{} 2>&1", cmd)])
}

// ── Quick Installs & Environments ─────────────────────────────────────

#[tauri::command]
fn check_install_status(envs: Vec<String>) -> HashMap<String, bool> {
    let mut status = HashMap::new();
    for env in envs {
        let binary = match env.as_str() {
            "node"|"bun"|"deno"|"fnm"|"go"|"python"|"ruby"|"php"|"zig"|"nim"|"elixir"|"erlang"|"java"|"kotlin"|"scala"|"swift"|"julia"|"haskell"|"ocaml" => env.as_str(),
            "rust" => "rustc", "c++" => "g++", "postgres" => "psql", "mysql" => "mysql", "mariadb" => "mysql",
            "sqlite" => "sqlite3", "redis" => "redis-cli", "mongodb" => "mongo", "cassandra" => "cqlsh",
            "docker" | "podman" | "terraform" | "ansible" | "pulumi" | "vagrant" | "packer" => env.as_str(),
            "kubernetes" => "kubectl", "minikube" => "minikube", "helm" => "helm", "k9s" => "k9s",
            "aws" => "aws", "gcloud" => "gcloud", "azure" => "az", "vercel" => "vercel", "heroku" => "heroku",
            "nginx" => "nginx", "apache" => "httpd", "caddy" => "caddy",
            "rabbitmq" => "rabbitmqctl", "kafka" => "kafka-topics.sh",
            "vscode" => "code", "antigravity" => "antigravity", "opencode" => "opencode", "terminal" => "kitty",
            "git" | "gh" | "glab" | "tmux" | "zellij" | "bat" | "eza" | "ripgrep" | "fzf" | "jq" | "yq" | "fd" | "htop" | "btop" | "ncdu" | "starship" | "zsh" | "fish" | "neofetch" | "postman" | "insomnia" | "k6" | "nmap" | "wireshark" | "metasploit" | "sqlmap" => env.as_str(),
            _ => "unknown",
        };
        let is_installed = if binary == "unknown" { false } else { run_cmd("sh", &["-c", &format!("command -v {}", binary)]).len() > 0 };
        status.insert(env, is_installed);
    }
    status
}

#[tauri::command]
async fn quick_install_bulk(envs: Vec<String>) -> String {
    let mut results = String::new();
    for env in envs {
        results.push_str(&format!("Installing {}...\n", env));
        let (cmd, skip): (String, bool) = match env.as_str() {
            "node" => ("curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && export NVM_DIR=\"$HOME/.nvm\" && [ -s \"$NVM_DIR/nvm.sh\" ] && \\. \"$NVM_DIR/nvm.sh\" && nvm install --lts".into(), false),
            "bun" => ("curl -fsSL https://bun.sh/install | bash".into(), false),
            "deno" => ("curl -fsSL https://deno.land/install.sh | sh".into(), false),
            "rust" => ("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y".into(), false),
            "go" => ("pkexec dnf install -y golang".into(), false),
            "python" => ("pkexec dnf install -y python3 python3-pip".into(), false),
            "java" => ("pkexec dnf install -y java-17-openjdk-devel".into(), false),
            "c++" => ("pkexec dnf group install -y \"C Development Tools and Libraries\"".into(), false),
            "postgres" => ("pkexec sh -c 'dnf install -y postgresql-server postgresql-contrib && postgresql-setup --initdb && systemctl enable --now postgresql'".into(), false),
            "mysql" | "mariadb" => ("pkexec sh -c 'dnf install -y mariadb-server && systemctl enable --now mariadb'".into(), false),
            "redis" => ("pkexec sh -c 'dnf install -y redis && systemctl enable --now redis'".into(), false),
            "docker" => ("pkexec sh -c 'dnf install -y moby-engine docker-compose && systemctl enable --now docker && usermod -aG docker $USER'".into(), false),
            "podman" => ("pkexec dnf install -y podman".into(), false),
            "terraform" => ("pkexec sh -c 'dnf install -y dnf-plugins-core && dnf config-manager --add-repo https://rpm.releases.hashicorp.com/fedora/hashicorp.repo && dnf -y install terraform'".into(), false),
            "aws" => ("curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\" && unzip awscliv2.zip && pkexec ./aws/install".into(), false),
            "vscode" => ("pkexec sh -c 'rpm --import https://packages.microsoft.com/keys/microsoft.asc && echo -e \"[code]\\nname=Visual Studio Code\\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\\nenabled=1\\ngpgcheck=1\\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc\" > /etc/yum.repos.d/vscode.repo && dnf install -y code'".into(), false),
            "antigravity" => ("pkexec dnf install -y antigravity".into(), false),
            "opencode" => ("pkexec dnf install -y opencode".into(), false),
            "terminal" => ("pkexec dnf install -y kitty".into(), false),
            "gh" => ("pkexec dnf install -y gh".into(), false),
            "tmux" => ("pkexec dnf install -y tmux".into(), false),
            "bat" => ("pkexec dnf install -y bat".into(), false),
            "eza" => ("pkexec dnf install -y eza".into(), false),
            "ripgrep" => ("pkexec dnf install -y ripgrep".into(), false),
            "fzf" => ("pkexec dnf install -y fzf".into(), false),
            "jq" => ("pkexec dnf install -y jq".into(), false),
            other => {
                if !is_safe_dnf_atom(other) {
                    (String::new(), true)
                } else {
                    (format!("pkexec dnf install -y {}", other), false)
                }
            }
        };
        if skip {
            results.push_str(&format!("Skipping invalid toolkit id: {}\n---\n", env));
            continue;
        }
        
        let out = if cmd.contains("{}") {
            run_cmd("sh", &["-c", &cmd.replace("{}", &env)])
        } else {
            run_cmd("sh", &["-c", &format!("{} 2>&1", cmd)])
        };
        results.push_str(&out);
        results.push_str("\n---\n");
    }
    results
}

// ── Configuration Files ───────────────────────────────────────────────

#[tauri::command]
fn get_config_files() -> Vec<ConfigEntry> {
    vec![
        ConfigEntry { name: "Starship".into(), path: "~/.config/starship.toml".into(), category: "Shell".into() },
        ConfigEntry { name: "Fish Config".into(), path: "~/.config/fish/config.fish".into(), category: "Shell".into() },
        ConfigEntry { name: "Kitty".into(), path: "~/.config/kitty/kitty.conf".into(), category: "Terminal".into() },
        ConfigEntry { name: "Tmux".into(), path: "~/.config/tmux/tmux.conf".into(), category: "Terminal".into() },
        ConfigEntry { name: "Neovim".into(), path: "~/.config/nvim/init.lua".into(), category: "Editor".into() },
        ConfigEntry { name: "Git Config".into(), path: "~/.config/git/config".into(), category: "Editor".into() },
    ]
}

#[tauri::command]
fn read_config_file(path: String) -> String {
    let expanded = path.replacen("~", &std::env::var("HOME").unwrap_or_default(), 1);
    std::fs::read_to_string(&expanded).unwrap_or_else(|_| format!("Error reading {}", path))
}

#[tauri::command]
fn get_disk_usage() -> String { run_cmd("sh", &["-c", "df -h / | tail -1 | awk '{print $3 \" / \" $2 \" (\" $5 \")\"}'"]) }

#[tauri::command]
async fn run_kydev_update() -> Result<String, String> {
    let log_path = kydev_data_dir()?.join("update.log");
    let q = sh_single_quote(&log_path.to_string_lossy());
    let pid = run_cmd(
        "sh",
        &["-c", &format!("bash ~/.kydev/update.sh > {} 2>&1 & echo $!", q)],
    );
    let pid = pid.trim().to_string();
    if pid.is_empty() {
        return Err("Failed to start update process".into());
    }
    Ok(pid)
}

#[tauri::command]
fn check_update_status(pid: String) -> HashMap<String, String> {
    let mut result = HashMap::new();
    let pid = pid.trim();
    if pid.is_empty() || !pid.chars().all(|c| c.is_ascii_digit()) {
        result.insert("running".into(), "done".into());
        result.insert("log".into(), "Invalid update process id".into());
        result.insert("success".into(), "false".into());
        return result;
    }
    let is_running = run_cmd("sh", &["-c", &format!("kill -0 {} 2>/dev/null && echo running || echo done", pid)])
        .trim()
        .to_string();
    result.insert("running".into(), is_running.clone());

    let log_output = match kydev_data_dir().and_then(|d| std::fs::read_to_string(d.join("update.log")).map_err(|e| e.to_string())) {
        Ok(content) => content.lines().rev().take(30).collect::<Vec<_>>().into_iter().rev().collect::<Vec<_>>().join("\n"),
        Err(_) => String::new(),
    };
    result.insert("log".into(), log_output);

    if is_running != "running" {
        let exit_code = run_cmd("sh", &["-c", &format!("wait {} 2>/dev/null; echo $?", pid)]);
        result.insert("success".into(), (exit_code.trim() == "0").to_string());
    }

    result
}

// ── Workspace State Persistence ───────────────────────────────────────

#[tauri::command]
fn save_state_file(state: String) -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let dir = format!("{}/.config/kydev", home);
    let path = format!("{}/state.json", dir);
    let _ = std::fs::create_dir_all(&dir);
    match std::fs::write(&path, &state) {
        Ok(_) => Ok("ok".into()),
        Err(e) => Err(format!("Failed to save state: {}", e)),
    }
}

#[tauri::command]
fn load_state_file() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    let path = format!("{}/.config/kydev/state.json", home);
    std::fs::read_to_string(&path).unwrap_or_default()
}

// ── Hermes Agent Commands ──────────────────────────────────────────

#[derive(Serialize)]
pub struct HermesInfo {
    pub installed: bool,
    pub version: String,
    pub path: String,
}

#[tauri::command]
async fn hermes_check_installed() -> HermesInfo {
    let path = run_cmd("sh", &["-c", "command -v hermes 2>/dev/null"]);
    let installed = !path.is_empty() && !path.contains("not found");
    let version = if installed { run_cmd("hermes", &["--version"]) } else { String::new() };
    HermesInfo { installed, version, path }
}

#[tauri::command]
async fn hermes_gateway_action(action: String) -> String {
    let mut args = vec!["gateway"];
    for p in action.split_whitespace() { args.push(p); }
    run_cmd("hermes", &args)
}

#[tauri::command]
async fn hermes_env_read() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    std::fs::read_to_string(format!("{}/.hermes/.env", home)).unwrap_or_default()
}

#[tauri::command]
async fn hermes_env_write(content: String) -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
    std::fs::write(format!("{}/.hermes/.env", home), &content).map(|_| "ok".into()).map_err(|e| format!("Write failed: {}", e))
}

#[tauri::command]
async fn hermes_config_read() -> String {
    let home = std::env::var("HOME").unwrap_or_default();
    std::fs::read_to_string(format!("{}/.hermes/config.yaml", home)).unwrap_or_default()
}

#[tauri::command]
async fn hermes_config_set(key: String, value: String) -> String {
    run_cmd("hermes", &["config", "set", &key, &value])
}

#[tauri::command]
async fn hermes_get_logs(log_type: String, lines: u32) -> String {
    run_cmd("hermes", &["logs", &log_type, "-n", &lines.to_string()])
}

#[tauri::command]
async fn hermes_sessions_list() -> String {
    run_cmd("hermes", &["sessions", "list"])
}

#[tauri::command]
async fn hermes_cron_list() -> String {
    run_cmd("hermes", &["cron", "list"])
}

#[tauri::command]
async fn hermes_cron_create(schedule: String, prompt: Option<String>, name: Option<String>, deliver: Option<String>, repeat: Option<u32>) -> String {
    let mut args: Vec<String> = vec!["cron".into(), "create".into()];
    if let Some(ref n) = name { args.push("--name".into()); args.push(n.clone()); }
    if let Some(ref d) = deliver { args.push("--deliver".into()); args.push(d.clone()); }
    if let Some(r) = repeat { args.push("--repeat".into()); args.push(r.to_string()); }
    args.push(schedule);
    if let Some(p) = prompt { args.push(p); }
    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_cmd("hermes", &arg_refs)
}

#[tauri::command]
async fn hermes_cron_remove(job_id: String) -> String {
    run_cmd("hermes", &["cron", "remove", &job_id])
}

#[tauri::command]
async fn hermes_run_doctor() -> String {
    run_cmd("hermes", &["doctor"])
}

#[tauri::command]
async fn hermes_get_status() -> String {
    run_cmd("hermes", &["status", "--all"])
}

// ── System Services (systemd) ────────────────────────────────────────

#[derive(Serialize)]
struct ServiceEntry {
    name: String,
    enabled: bool,
    active: bool,
    description: String,
}

#[tauri::command]
async fn list_system_services() -> Vec<ServiceEntry> {
    // Single batch call for active units
    let units_out = run_cmd("systemctl", &["list-units", "--type=service", "--all", "--no-pager", "--plain", "--no-legend"]);
    // Single batch call to get enabled state for all service files at once
    let enabled_out = run_cmd("systemctl", &["list-unit-files", "--type=service", "--no-pager", "--plain", "--no-legend"]);
    
    // Build enabled map from batch output
    let enabled_map: std::collections::HashMap<&str, bool> = enabled_out.lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let state = parts[1];
                Some((parts[0], state == "enabled" || state == "enabled-runtime"))
            } else { None }
        })
        .collect();

    let mut services = Vec::new();
    for line in units_out.lines().take(80) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 { continue; }
        let unit_name = parts[0];
        let name = unit_name.trim_end_matches('.').to_string();
        let active = parts[2] == "active";
        let enabled = *enabled_map.get(unit_name).unwrap_or(&false);
        let description = parts[4..].join(" ");
        services.push(ServiceEntry { name, enabled, active, description });
    }
    services
}

#[tauri::command]
async fn manage_service(name: String, action: String) -> Result<String, String> {
    let valid = ["start", "stop", "restart", "enable", "disable"];
    if !valid.contains(&action.as_str()) { return Err("Invalid action".into()); }
    match tokio::process::Command::new("pkexec")
        .args(["systemctl", &action, &name])
        .output().await {
        Ok(o) => {
            let out = String::from_utf8_lossy(&o.stdout).to_string();
            let err = String::from_utf8_lossy(&o.stderr).to_string();
            if o.status.success() { Ok(out) } else { Err(err) }
        }
        Err(e) => Err(e.to_string())
    }
}

// ── Env Studio ────────────────────────────────────────────────────────

#[derive(Serialize, serde::Deserialize)]
struct EnvVar {
    key: String,
    value: String,
}

#[tauri::command]
async fn read_env_file(path: String) -> Result<Vec<EnvVar>, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let vars = content.lines()
        .filter(|l| !l.trim().is_empty() && !l.trim_start().starts_with('#'))
        .filter_map(|line| line.split_once('='))
        .map(|(k, v)| EnvVar {
            key: k.trim().to_string(),
            value: v.trim_matches('"').trim_matches('\'').to_string(),
        })
        .collect();
    Ok(vars)
}

#[tauri::command]
async fn write_env_file(path: String, vars: Vec<EnvVar>) -> Result<(), String> {
    let content = vars.iter()
        .map(|v| format!("{}={}", v.key, v.value))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(&path, content + "\n").map_err(|e| e.to_string())
}

#[tauri::command]
async fn find_env_files(root: String) -> Vec<String> {
    let mut results = Vec::new();
    fn walk(dir: &std::path::Path, results: &mut Vec<String>, depth: usize) {
        if depth > 3 { return; }
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name();
                let name_str = name.to_string_lossy();
                if name_str.starts_with('.') && name_str != ".env" && !name_str.starts_with(".env.") { continue; }
                if name_str.starts_with("node_modules") || name_str.starts_with(".git") { continue; }
                if path.is_dir() { walk(&path, results, depth + 1); }
                else if name_str == ".env" || name_str.starts_with(".env.") {
                    results.push(path.to_string_lossy().to_string());
                }
            }
        }
    }
    walk(std::path::Path::new(&root), &mut results, 0);
    results
}

// ── Snippet Vault ──────────────────────────────────────────────────────

fn snippets_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".into());
    std::path::PathBuf::from(format!("{}/.local/share/kydev/snippets.json", home))
}

#[derive(Serialize, serde::Deserialize, Clone)]
struct Snippet {
    id: String,
    title: String,
    command: String,
    tags: Vec<String>,
}

#[tauri::command]
async fn get_snippets() -> Vec<Snippet> {
    let path = snippets_path();
    if !path.exists() { return vec![]; }
    serde_json::from_str(&std::fs::read_to_string(path).unwrap_or_default()).unwrap_or_default()
}

#[tauri::command]
async fn save_snippets(snippets: Vec<Snippet>) -> Result<(), String> {
    let path = snippets_path();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).ok(); }
    std::fs::write(path, serde_json::to_string_pretty(&snippets).unwrap_or_default())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn run_snippet(command: String) -> Result<String, String> {
    run_async_cmd("sh", &["-c", &command]).await
}

// ── SSH Manager ────────────────────────────────────────────────────────

#[derive(Serialize, serde::Deserialize, Clone)]
struct SshHost {
    alias: String,
    hostname: String,
    user: String,
    port: String,
    identity_file: String,
}

fn ssh_config_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".into());
    std::path::PathBuf::from(format!("{}/.ssh/config", home))
}

#[tauri::command]
async fn get_ssh_hosts() -> Vec<SshHost> {
    let content = match std::fs::read_to_string(ssh_config_path()) {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let mut hosts = Vec::new();
    let mut current: Option<SshHost> = None;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.to_lowercase().starts_with("host ") && !trimmed.to_lowercase().starts_with("hostname") {
            if let Some(h) = current.take() { if !h.alias.is_empty() && h.alias != "*" { hosts.push(h); } }
            let alias = trimmed[5..].trim().to_string();
            current = Some(SshHost { alias, hostname: "".into(), user: "".into(), port: "22".into(), identity_file: "".into() });
        } else if let Some(ref mut h) = current {
            if let Some((k, v)) = trimmed.split_once(' ') {
                match k.to_lowercase().as_str() {
                    "hostname" => h.hostname = v.trim().into(),
                    "user" => h.user = v.trim().into(),
                    "port" => h.port = v.trim().into(),
                    "identityfile" => h.identity_file = v.trim().into(),
                    _ => {}
                }
            }
        }
    }
    if let Some(h) = current { if !h.alias.is_empty() && h.alias != "*" { hosts.push(h); } }
    hosts
}

#[tauri::command]
async fn add_ssh_host(host: SshHost) -> Result<(), String> {
    let path = ssh_config_path();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).ok(); }
    let entry = format!(
        "\nHost {}\n    HostName {}\n    User {}\n    Port {}\n{}\n",
        host.alias, host.hostname, host.user, host.port,
        if !host.identity_file.is_empty() { format!("    IdentityFile {}", host.identity_file) } else { "".into() }
    );
    let mut content = std::fs::read_to_string(&path).unwrap_or_default();
    content.push_str(&entry);
    std::fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_ssh_host(alias: String) -> Result<(), String> {
    let path = ssh_config_path();
    let content = std::fs::read_to_string(&path).unwrap_or_default();
    let mut output = String::new();
    let mut skip = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.to_lowercase().starts_with("host ") && !trimmed.to_lowercase().starts_with("hostname") {
            skip = trimmed[5..].trim() == alias;
        }
        if !skip { output.push_str(line); output.push('\n'); }
    }
    std::fs::write(path, output).map_err(|e| e.to_string())
}

// ── Quick Notes ────────────────────────────────────────────────────────

fn notes_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".into());
    std::path::PathBuf::from(format!("{}/.local/share/kydev/notes.md", home))
}

#[tauri::command]
async fn get_notes() -> String {
    std::fs::read_to_string(notes_path()).unwrap_or_default()
}

#[tauri::command]
async fn save_notes(content: String) -> Result<(), String> {
    let path = notes_path();
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).ok(); }
    std::fs::write(path, content).map_err(|e| e.to_string())
}

// ── Enhanced Process Monitor ───────────────────────────────────────────

#[derive(Serialize)]
struct ProcessEntry {
    pid: u32,
    name: String,
    port: u16,
    proto: String,
    state: String,
}

#[tauri::command]
async fn list_processes() -> Vec<ProcessEntry> {
    let out = run_cmd("sh", &["-c", "ss -tulnp 2>/dev/null | tail -n +2"]);
    let mut entries = Vec::new();
    for line in out.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 { continue; }
        let proto = parts[0].to_string();
        let state = parts[1].to_string();
        let local_addr = parts[4];
        let port: u16 = local_addr.rsplit(':').next().and_then(|p| p.parse().ok()).unwrap_or(0);
        if port == 0 { continue; }
        let process_info = parts.get(6).unwrap_or(&"");
        let name = if let Some(start) = process_info.find("\"") {
            let rest = &process_info[start+1..];
            rest.split('\"').next().unwrap_or("unknown").to_string()
        } else { "unknown".to_string() };
        let pid: u32 = process_info.split("pid=").nth(1).and_then(|s| s.split(',').next()).and_then(|p| p.parse().ok()).unwrap_or(0);
        entries.push(ProcessEntry { pid, name, port, proto, state });
    }
    entries.sort_by_key(|e| e.port);
    entries
}

// ── App Entry ─────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
         .invoke_handler(tauri::generate_handler![
              get_system_info, check_updates, preview_updates, run_update, run_cleanup, get_dnf_history,
              scan_projects, run_project_script, open_in_editor, scaffold_project, run_kydev_update, check_update_status,
              git_current_branch, git_status, git_diff, git_stage, git_unstage, git_commit, git_push, git_pull, git_log, git_branches, git_checkout,
              save_state_file, load_state_file,
              list_ports, kill_process,
             search_packages, get_package_details, install_package, remove_package,
             get_containers, run_docker_compose, run_docker_action, write_compose_file, send_http_request,
             start_tunnel, get_tunnel_log, stop_tunnel, run_db_query,
             check_service, start_service,
             check_install_status, quick_install_bulk,
             get_config_files, read_config_file, get_disk_usage,
             hermes_check_installed, hermes_gateway_action, hermes_env_read, hermes_env_write,
             hermes_config_read, hermes_config_set, hermes_get_logs,
             hermes_sessions_list, hermes_cron_list, hermes_cron_create, hermes_cron_remove,
             hermes_run_doctor, hermes_get_status,
             list_system_services, manage_service,
             read_env_file, write_env_file, find_env_files,
             get_snippets, save_snippets, run_snippet,
             get_ssh_hosts, add_ssh_host, delete_ssh_host,
             get_notes, save_notes,
             list_processes,
         ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

import re

with open('src-tauri/src/lib.rs', 'r') as f:
    content = f.read()

# We need to change specific functions to use run_async_cmd.
# Let's do it manually with regexes or targeted replacements.

replacements = [
    (
        r'async fn check_updates\(\) -> UpdateInfo \{[\s\S]*?\}',
        r'''async fn check_updates() -> UpdateInfo {
    let output = run_async_cmd("sh", &["-c", "dnf check-update -q 2>/dev/null | grep -v '^$' | grep -v 'Security' | wc -l"]).await.unwrap_or_default();
    let count = output.trim().parse::<u32>().unwrap_or(0);
    UpdateInfo { count, has_updates: count > 0 }
}'''
    ),
    (
        r'async fn preview_updates\(\) -> Vec<UpdatePreview> \{[\s\S]*?\}',
        r'''async fn preview_updates() -> Vec<UpdatePreview> {
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
}'''
    ),
    (
        r'async fn run_update\(\) -> String \{ run_cmd\("sh", &\["-c", "pkexec dnf upgrade -y 2>&1 \| tail -50"\]\) \}',
        r'''async fn run_update() -> Result<String, String> { 
    run_async_cmd("pkexec", &["dnf", "upgrade", "-y"]).await
}'''
    ),
    (
        r'async fn run_cleanup\(\) -> String \{[\s\S]*?\}',
        r'''async fn run_cleanup() -> Result<String, String> {
    let auto = run_async_cmd("pkexec", &["dnf", "autoremove", "-y"]).await.unwrap_or_default();
    let clean = run_async_cmd("pkexec", &["dnf", "clean", "all"]).await.unwrap_or_default();
    Ok(format!("{}\n---\n{}", auto, clean))
}'''
    ),
    (
        r'async fn get_dnf_history\(\) -> Vec<HistoryEntry> \{[\s\S]*?\}',
        r'''async fn get_dnf_history() -> Vec<HistoryEntry> {
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
}'''
    ),
    (
        r'async fn install_package\(name: String\) -> String \{ run_cmd\("sh", &\["-c", &format!\("pkexec dnf install -y \{\} 2>&1 \| tail -20", name\)]\) \}',
        r'''async fn install_package(name: String) -> Result<String, String> { 
    run_async_cmd("pkexec", &["dnf", "install", "-y", &name]).await
}'''
    ),
    (
        r'async fn remove_package\(name: String\) -> String \{ run_cmd\("sh", &\["-c", &format!\("pkexec dnf remove -y \{\} 2>&1 \| tail -20", name\)]\) \}',
        r'''async fn remove_package(name: String) -> Result<String, String> { 
    run_async_cmd("pkexec", &["dnf", "remove", "-y", &name]).await
}'''
    ),
    (
        r'async fn search_packages\(query: String\) -> Vec<PackageInfo> \{[\s\S]*?\}',
        r'''async fn search_packages(query: String) -> Vec<PackageInfo> {
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
}'''
    ),
    (
        r'async fn get_package_details\(name: String\) -> PackageInfo \{[\s\S]*?pkg\n\}',
        r'''async fn get_package_details(name: String) -> PackageInfo {
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
}'''
    ),
    (
        r'async fn run_docker_compose\(path: String, action: String\) -> String \{\s*let cmd = format!\("cd \{\} && docker compose \{\} 2>&1 \|\| docker-compose \{\} 2>&1", path, action, action\);\s*run_cmd\("sh", &\["-c", &cmd\]\)\s*\}',
        r'''async fn run_docker_compose(path: String, action: String) -> Result<String, String> {
    let res = tokio::process::Command::new("docker")
        .current_dir(&path).arg("compose").arg(&action).output().await;
    match res {
        Ok(o) => {
            if o.status.success() { Ok(String::from_utf8_lossy(&o.stdout).to_string()) }
            else { Err(String::from_utf8_lossy(&o.stderr).to_string()) }
        }
        Err(e) => Err(e.to_string())
    }
}'''
    ),
    (
        r'async fn run_docker_action\(id: String, action: String\) -> String \{\s*run_cmd\("sh", &\["-c", &format!\("docker \{\} \{\} 2>&1", action, id\)\]\)\s*\}',
        r'''async fn run_docker_action(id: String, action: String) -> Result<String, String> {
    run_async_cmd("docker", &[&action, &id]).await
}'''
    ),
    (
        r'async fn get_containers\(\) -> Vec<ContainerInfo> \{[\s\S]*?\}',
        r'''async fn get_containers() -> Vec<ContainerInfo> {
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
}'''
    ),
    (
        r'async fn run_project_script\(path: String, script: String, lang: String\) -> String \{[\s\S]*?\}',
        r'''async fn run_project_script(path: String, script: String, lang: String) -> Result<String, String> {
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
}'''
    ),
    (
        r'async fn open_in_editor\(path: String, editor: String\) -> String \{ run_cmd\("sh", &\["-c", &format!\("\{\} \{\} &", editor, path\)\]\) \}',
        r'''async fn open_in_editor(path: String, editor: String) -> Result<String, String> { 
    match tokio::process::Command::new(&editor).arg(&path).spawn() {
        Ok(_) => Ok("Opened".into()),
        Err(e) => Err(e.to_string())
    }
}'''
    )
]

for old, new in replacements:
    if not re.search(old, content):
        print(f"Warning: Could not find match for:\n{old[:100]}...")
    content = re.sub(old, new, content)

with open('src-tauri/src/lib.rs', 'w') as f:
    f.write(content)

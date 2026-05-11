# 🏗️ Architecture & Technical Decisions

KyDev relies on the **Tauri Framework** to combine a blazing fast Rust backend with a modern React frontend.

## 1. System Communication Bridging
Unlike traditional web apps, KyDev is a system-level application. The Rust backend acts as a bridge to native Linux binaries.

We use Rust's `std::process::Command` to execute shell commands:
```rust
fn run_cmd(cmd: &str, args: &[&str]) -> String {
    Command::new(cmd).args(args).output()...
}
```
This paradigm is used across all features:
- **API Tester**: Uses `curl` to execute HTTP requests, returning the status, headers, and body.
- **Docker**: Uses `docker ps` and `docker logs`.
- **Database**: Uses `psql`, `mysql`, and `redis-cli` to execute raw queries string-escaped from the UI.

## 2. Privilege Escalation (`pkexec`)
For actions requiring `sudo` (like DNF installs), KyDev uses `pkexec`. 
`pkexec` is the PolicyKit execution engine native to Linux desktop environments. When KyDev calls `pkexec dnf install ...`, the host Operating System automatically intercepts the call and presents a secure, native GUI password prompt to the user. This ensures KyDev never stores or hardcodes user passwords.

## 3. Frontend Architecture
The frontend is built for maximum speed and density:
- **Framework**: React 18 (Vite)
- **Styling**: TailwindCSS with `daisyUI`.
- **Theme**: `business` theme, chosen for its professional, high-contrast, low-eyestrain aesthetic suitable for long coding sessions.
- **Icons**: `react-icons/tb` (Tabler Icons) for unified, professional, monolinear system iconography.

## 4. State Management
State is localized within page components. Communication with the backend is done purely asynchronously via Tauri's `invoke` API, ensuring the UI thread is never blocked, even when installing large packages or scaffolding Next.js applications.

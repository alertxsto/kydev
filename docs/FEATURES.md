# 🌟 Detailed Features

KyDev v0.5.1 includes a hardcore suite of developer tools designed to replace multiple third-party applications.

## 1. Project Management
- **Directory Scanner**: Recursively scans a selected directory for active Git repositories.
- **Git Status**: Displays the current branch and alerts if the working tree is dirty.
- **Script Runner**: Automatically parses `package.json`, `Cargo.toml`, and `go.mod` to provide 1-click execution for project scripts (e.g., `npm run dev`, `cargo build`).
- **Editor Integration**: Open your projects instantly in **VS Code**, **Antigravity**, **OpenCode**, or a standalone **Kitty Terminal**.

## 2. Project Bootstrapper (Scaffolder)
A built-in GUI to generate brand new projects.
- **Supported Templates**: Next.js, Vite + React, Rust Cargo, Go Module, Python Venv.
- **Auto Add-ons**: Easily inject dependencies like Prisma ORM or Zustand directly during the scaffolding process.
- **Execution**: Runs native CLIs in the background and tails the execution log to the UI.

## 3. Package Manager (DNF GUI)
A fully functional GUI for Fedora's `dnf` package manager.
- **Search**: Search remote repositories.
- **Manage**: Install and remove packages securely via `pkexec`.
- **System Upgrades**: Preview system updates and apply them in bulk.
- **History**: Parse and view `dnf history list` directly in the UI.

## 4. Local DB Studio & Connection Doctor
Stop launching massive database clients just to drop a table on localhost.
- Connect to **PostgreSQL**, **MySQL**, and **Redis**.
- **Connection Doctor**: Automatically detects if your local `mysqld` or `postgresql` system services are dead, offering a 1-click "Start Service" fix via `systemctl`.
- Write and execute raw queries (e.g., `SELECT * FROM users`, `FLUSHALL`).

## 5. API Tester with History
A built-in alternative to Postman or Insomnia.
- **No CORS Issues**: Requests are made directly from the Rust backend using `curl`, bypassing all browser CORS restrictions.
- **History Sidebar**: Automatically saves your most recent successful payloads, endpoints, and headers so you can rapidly re-test APIs without retyping.
- Supports `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
- Configurable Headers and JSON Payload body.

## 6. Localhost Tunneling
- Expose local ports (e.g., `localhost:3000`) to the public internet using `npx localtunnel`.
- The app automatically parses the output to provide you with a clickable, copiable public URL.
- One-click to stop the tunnel and kill the background process.

## 7. Docker Manager & Visual Builder
- **Manager**: Views all containers parsed from `docker ps -a`. Start, Stop, Prune, and view Live Logs directly from the GUI.
- **Compose Builder**: Visually check the services you need (Postgres, Redis, MySQL, Nginx). KyDev will auto-generate the `docker-compose.yml` file with the correct networks and ports, and immediately spin up the environment for you.

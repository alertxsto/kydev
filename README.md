# 🛠️ KyDev Toolbox

![Version](https://img.shields.io/badge/version-0.8.7-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux-lightgrey.svg)

**KyDev Toolbox** is the ultimate native Linux Developer Dashboard. Built specifically for developers on Linux (specifically Fedora/RHEL-based distributions utilizing DNF), KyDev transforms your daily system management and development tasks into a 1-click graphical experience.

Forget keeping 10 different terminal windows open for logs, database queries, and port forwarding. KyDev brings it all into one sleek, high-performance desktop application built with **Rust** and **Tauri**.

## ⚡ Quick Install (Copy & Paste)

For Fedora/RHEL users, you can install and build KyDev instantly by pasting this into your terminal:

```bash
curl -sSfL https://raw.githubusercontent.com/alertxsto/kydev/main/install.sh | bash
```

## 🚀 Key Features

- **Mega Environments (Quick Install)**: 1-click bootstrap for 100+ developer toolchains.
- **Project Bootstrapper**: Instantly scaffold Next.js, Vite+React, Rust, Go, or Python projects. Auto-installs add-ons like Prisma and Zustand.
- **Docker Manager & Visual Builder**: Auto-generate `docker-compose.yml` visually by checking services (Postgres, Redis, Nginx). Manage running containers natively.
- **Local DB Studio & Connection Doctor**: Execute raw SQL queries against PostgreSQL/MySQL/Redis. If a service is down, the Connection Doctor will diagnose and auto-start it for you.
- **Built-in API Tester**: A mini-Postman replacement with request history, bypassing all CORS policies using native `curl`.
- **Localhost Tunneling**: Expose your local development server to the internet using built-in `localtunnel` integrations.
- **Native DNF Package Manager**: Search, install, remove packages, and view your DNF transaction history.
- **Persistent Workspace State**: Switch between tasks without losing your place. Your terminal logs and active requests stay exactly as you left them.

## 🔄 Updating KyDev

KyDev has an **Auto-Updater built into the UI**! When a new version is pushed to GitHub, you will see a notification in the sidebar. Click **"Update Now"** to automatically install it.

Alternatively, if you prefer the terminal (and want to see the Dank ASCII installer in action), you can trigger an update manually:
```bash
curl -sSfL https://raw.githubusercontent.com/alertxsto/kydev/main/update.sh | bash
```

## 🗑️ Uninstalling

If you ever want to completely remove KyDev and its source files from your system, you can use the uninstall script:
```bash
curl -sSfL https://raw.githubusercontent.com/alertxsto/kydev/main/uninstall.sh | bash
```

## 📚 Documentation

For complete documentation on how the app is structured and how to use every feature, please check the `docs` directory:

- [Getting Started Guide](./docs/GETTING_STARTED.md)
- [Detailed Features](./docs/FEATURES.md)
- [Architecture & Tech Stack](./docs/ARCHITECTURE.md)

## 💻 Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, daisyUI, Tabler Icons.
- **Backend**: Rust, Tauri, Native Linux Shell (`sh`, `pkexec`, `dnf`, `curl`).

## 🔐 Security Note

KyDev embraces standard Linux security paradigms. Privileged operations (like installing system packages or restarting system services) securely prompt for your password using **`pkexec`** (PolicyKit), ensuring no hardcoded passwords are ever used.

---
*Built for the ultimate Linux Developer experience.*

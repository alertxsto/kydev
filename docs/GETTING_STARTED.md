# 🚀 Getting Started

Follow these instructions to set up KyDev for local development.

## 1. Prerequisites

Before running KyDev, ensure you have the following installed on your Fedora/Linux system:
- **Node.js** (v18+) & `npm`
- **Rust** & Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **System Dependencies** required by Tauri:
  ```bash
  sudo dnf install webkit2gtk4.1-devel curl wget file libappindicator-gtk3-devel librsvg2-devel
  ```

*Optional but Recommended* (for advanced features):
- Docker (`moby-engine`)
- Native DB Clients: `postgresql`, `mariadb`, `redis`
- Localtunnel (`npm install -g localtunnel`)

## 2. Installation

Clone the repository and install the frontend dependencies:
```bash
git clone <your-repo-url>
cd kydev
npm install
```

## 3. Running in Development Mode

To run the app with Hot-Module Replacement (HMR) for the frontend and auto-recompilation for the Rust backend:
```bash
npm run tauri dev
```

## 4. Building for Production

To compile a highly optimized, standalone native binary:
```bash
npm run tauri build
```
The compiled executable will be available in `src-tauri/target/release/kydev`. You can move this binary anywhere on your system or create a `.desktop` shortcut for it.

## 5. Usage Tips
- **Package Manager**: You will be prompted for your password natively by the OS when applying updates.
- **API Tester**: Ensure your local servers are running. You can target `localhost:port` or `127.0.0.1:port`.
- **Docker**: Your user must be in the `docker` group to manage containers without `sudo`.

#!/bin/bash
set -e

echo "🚀 [1/5] Installing system dependencies (WebKit, GTK, etc)..."
sudo dnf install -y webkit2gtk4.1-devel curl wget openssl-devel libappindicator-gtk3-devel librsvg2-devel

echo "📥 [2/5] Cloning KyDev repository into ~/.kydev..."
rm -rf ~/.kydev
git clone https://github.com/alertxsto/kydev.git ~/.kydev
cd ~/.kydev

echo "📦 [3/5] Installing Node.js packages..."
npm install

echo "🦀 [4/5] Compiling Rust backend (This might take a minute, grab some coffee ☕)..."
npm run tauri build

echo "⚙️ [5/5] Moving binary to /usr/local/bin for global access..."
sudo cp src-tauri/target/release/kydev /usr/local/bin/kydev

echo "✨ BOOM! KyDev is successfully installed! Type 'kydev' in your terminal to launch."

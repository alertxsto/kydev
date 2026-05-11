#!/bin/bash
set -eo pipefail

B_MAGENTA=$'\033[1;35m'
B_CYAN=$'\033[1;36m'
B_GREEN=$'\033[1;32m'
B_YELLOW=$'\033[1;33m'
B_RED=$'\033[1;31m'
NC=$'\033[0m'

typewriter() {
    local text="$1"
    local delay="${2:-0.01}"
    for (( i=0; i<${#text}; i++ )); do
        printf "%s" "${text:$i:1}"
        sleep "$delay"
    done
    echo ""
}

info() { echo -e "\n${B_CYAN}╭─ ▶ $1${NC}"; }
step() { echo -e "${B_CYAN}│${NC}  $1"; }
success() { echo -e "${B_CYAN}╰─ ${B_GREEN}✔${NC} $1"; }
fatal() { echo -e "${B_CYAN}╰─ ${B_RED}✖${NC} $1"; exit 1; }

clear
echo -e "${B_MAGENTA}"
cat << "EOF"
██╗  ██╗██╗   ██╗██████╗ ███████╗██╗   ██╗
██║ ██╔╝╚██╗ ██╔╝██╔══██╗██╔════╝██║   ██║
█████╔╝  ╚████╔╝ ██║  ██║█████╗  ██║   ██║
██╔═██╗   ╚██╔╝  ██║  ██║██╔══╝  ╚██╗ ██╔╝
██║  ██╗   ██║   ██████╔╝███████╗ ╚████╔╝ 
╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚══════╝  ╚═══╝  
EOF
echo -e "${NC}"
typewriter "       :: KYDEV UPGRADE SEQUENCE INITIATED ::" 0.01
echo -e " ${B_YELLOW}═════════════════════════════════════════════════════════${NC}\n"

if [ ! -d "$HOME/.kydev" ]; then
    fatal "KyDev directory not found. Please run the installer first."
fi

cd ~/.kydev

info "Pulling Source Code"
step "Fetching the latest master frame from GitHub..."
git fetch origin main 2>&1 | sed -e "s/^/    ${B_MAGENTA}│${NC}  /"
git reset --hard origin/main 2>&1 | sed -e "s/^/    ${B_MAGENTA}│${NC}  /"
success "Source code synced."

info "Updating Dependencies"
step "Refreshing Node.js modules..."
npm install > /dev/null 2>&1
success "Node modules mapped."

info "Recompiling Backend"
step "Executing Tauri build engine (This may take a moment)..."
npm run tauri build 2>&1 | sed -e "s/^/    ${B_YELLOW}│${NC}  /"
success "Binary successfully forged."

info "Deploying Updates"
step "Detecting current installation..."
if [ -f /usr/local/bin/kydev ]; then
    step "Found system-wide install, updating /usr/local/bin/kydev..."
    pkexec bash -c "
      cp -f $HOME/.kydev/src-tauri/target/release/kydev /usr/local/bin/kydev.new
      mv -f /usr/local/bin/kydev.new /usr/local/bin/kydev
      cp -f $HOME/.kydev/src-tauri/icons/128x128.png /usr/share/pixmaps/kydev.png
      cp -f $HOME/.kydev/kydev.desktop /usr/share/applications/kydev.desktop
      update-desktop-database /usr/share/applications
    " 2>&1 | sed -e "s/^/    ${B_YELLOW}│${NC}  /"
    # cleanup user-level leftovers silently
    rm -f "${HOME}/.local/bin/kydev" "${HOME}/.local/bin/kydev.new" 2>/dev/null || true
    rm -f "${HOME}/.local/share/applications/kydev.desktop" 2>/dev/null || true
    rm -f "${HOME}/.local/share/icons/kydev.png" 2>/dev/null || true
    success "Global binary and launcher replaced."
elif [ -f "${HOME}/.local/bin/kydev" ]; then
    step "Found user-level install, updating ~/.local/bin/kydev..."
    mkdir -p "${HOME}/.local/bin" "${HOME}/.local/share/applications" "${HOME}/.local/share/icons"
    cp -f src-tauri/target/release/kydev "${HOME}/.local/bin/kydev.new"
    mv -f "${HOME}/.local/bin/kydev.new" "${HOME}/.local/bin/kydev"
    chmod +x "${HOME}/.local/bin/kydev"
    cp src-tauri/icons/128x128.png "${HOME}/.local/share/icons/kydev.png"
    sed "s|Exec=/usr/local/bin/kydev|Exec=${HOME}/.local/bin/kydev|g; s|Icon=kydev|Icon=${HOME}/.local/share/icons/kydev.png|g" kydev.desktop > "${HOME}/.local/share/applications/kydev.desktop"
    chmod 644 "${HOME}/.local/share/applications/kydev.desktop"
    update-desktop-database "${HOME}/.local/share/applications" 2>/dev/null || true
    # cleanup system-level leftovers (best-effort)
    sudo rm -f /usr/local/bin/kydev /usr/local/bin/kydev.new 2>/dev/null || true
    sudo rm -f /usr/share/applications/kydev.desktop 2>/dev/null || true
    sudo rm -f /usr/share/pixmaps/kydev.png 2>/dev/null || true
    sudo update-desktop-database /usr/share/applications 2>/dev/null || true
    success "User-level binary and launcher replaced."
    echo -e "${B_CYAN}│${NC}  Tambahkan ${B_MAGENTA}${HOME}/.local/bin${B_CYAN} ke PATH jika belum."
else
    echo -e "${B_YELLOW}│${NC}  No previous install found, using system-wide by default..."
    pkexec bash -c "
      cp -f $HOME/.kydev/src-tauri/target/release/kydev /usr/local/bin/kydev.new
      mv -f /usr/local/bin/kydev.new /usr/local/bin/kydev
      cp -f $HOME/.kydev/src-tauri/icons/128x128.png /usr/share/pixmaps/kydev.png
      cp -f $HOME/.kydev/kydev.desktop /usr/share/applications/kydev.desktop
      update-desktop-database /usr/share/applications
    " 2>&1 | sed -e "s/^/    ${B_YELLOW}│${NC}  /"
    success "Global binary and launcher installed."
fi

echo -e "\n${B_GREEN}   ╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${B_GREEN}   ║             ✨ UPGRADE COMPLETE! ✨               ║${NC}"
echo -e "${B_GREEN}   ╚═══════════════════════════════════════════════════╝${NC}"
echo -e "\n${B_CYAN}   ▶ Please restart KyDev to experience the new features.${NC}\n"

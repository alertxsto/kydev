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
step "Applying updates to system binary & launcher (Password may be required)..."
if command -v pkexec >/dev/null 2>&1; then
    pkexec bash -c "cp src-tauri/target/release/kydev /usr/local/bin/kydev && cp src-tauri/icons/128x128.png /usr/share/pixmaps/kydev.png && cp kydev.desktop /usr/share/applications/kydev.desktop && update-desktop-database /usr/share/applications"
    success "Global binary and launcher replaced."
else
    echo -e "${B_YELLOW}│${NC}  pkexec not found, using user-level installation..."
    mkdir -p "${HOME}/.local/bin" "${HOME}/.local/share/applications" "${HOME}/.local/share/icons"
    cp src-tauri/target/release/kydev "${HOME}/.local/bin/kydev"
    chmod +x "${HOME}/.local/bin/kydev"
    cp src-tauri/icons/128x128.png "${HOME}/.local/share/icons/kydev.png"
    cp kydev.desktop "${HOME}/.local/share/applications/kydev.desktop"
    sed -i "s|Exec=/usr/local/bin/kydev|Exec=${HOME}/.local/bin/kydev|g" "${HOME}/.local/share/applications/kydev.desktop"
    sed -i "s|Icon=kydev|Icon=${HOME}/.local/share/icons/kydev.png|g" "${HOME}/.local/share/applications/kydev.desktop"
    chmod 644 "${HOME}/.local/share/applications/kydev.desktop"
    update-desktop-database "${HOME}/.local/share/applications" 2>/dev/null || true
    success "User-level binary and launcher replaced."
    echo -e "${B_CYAN}│${NC}  Tambahkan ${B_MAGENTA}${HOME}/.local/bin${B_CYAN} ke PATH jika belum."
fi

echo -e "\n${B_GREEN}   ╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${B_GREEN}   ║             ✨ UPGRADE COMPLETE! ✨               ║${NC}"
echo -e "${B_GREEN}   ╚═══════════════════════════════════════════════════╝${NC}"
echo -e "\n${B_CYAN}   ▶ Please restart KyDev to experience the new features.${NC}\n"

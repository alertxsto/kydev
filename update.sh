#!/bin/bash
set -e

B_MAGENTA='\033[1;35m'
B_CYAN='\033[1;36m'
B_GREEN='\033[1;32m'
B_YELLOW='\033[1;33m'
B_RED='\033[1;31m'
NC='\033[0m'

typewriter() {
    local text="$1"
    local delay="${2:-0.01}"
    for (( i=0; i<${#text}; i++ )); do
        printf "${text:$i:1}"
        sleep $delay
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
git pull origin main 2>&1 | sed -e "s/^/    ${B_MAGENTA}│${NC}  /"
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
step "Applying updates to system binary (Password may be required)..."
pkexec cp src-tauri/target/release/kydev /usr/local/bin/kydev
success "Global binary replaced."

echo -e "\n${B_GREEN}   ╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${B_GREEN}   ║             ✨ UPGRADE COMPLETE! ✨               ║${NC}"
echo -e "${B_GREEN}   ╚═══════════════════════════════════════════════════╝${NC}"
echo -e "\n${B_CYAN}   ▶ Please restart KyDev to experience the new features.${NC}\n"

#!/bin/bash
set -e

B_MAGENTA='\033[1;35m'
B_CYAN='\033[1;36m'
B_GREEN='\033[1;32m'
B_YELLOW='\033[1;33m'
B_RED='\033[1;31m'
NC='\033[0m'

spinner() {
    local pid=$!
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [${B_MAGENTA}%c${NC}]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

info() { echo -e "${B_CYAN}[*]${NC} $1"; }
success() { echo -e "${B_GREEN}[✔]${NC} $1"; }

clear
echo -e "${B_MAGENTA}"
cat << "EOF"
    __  __      ____             
   / /_/ /_  __/ __ \___ _   __
  / //_/ / / / / / / / _ \ | / /
 / ,< / /_/ / /_/ /  __/ |/ / 
/_/|_|\__, /_____/\___/|___/  
     /____/                   
EOF
echo -e "${NC}"
echo -e " ${B_CYAN}:: KyDev Upgrade Sequence Initiated ::${NC}"
echo -e " ${B_YELLOW}---------------------------------------------${NC}\n"

if [ ! -d "$HOME/.kydev" ]; then
    echo -e "${B_RED}[x] KyDev directory not found. Please install first.${NC}"
    exit 1
fi

cd ~/.kydev

info "Pulling latest master frame from GitHub..."
git pull origin main > /dev/null 2>&1 & spinner
success "Source code synced."

info "Updating Node.js dependencies..."
npm install > /dev/null 2>&1 & spinner
success "Node modules updated."

info "Recompiling Rust backend (Grab some coffee ☕)..."
npm run tauri build > build.log 2>&1 & spinner
success "Binary compiled."

info "Applying updates to system binary (Password required)..."
pkexec cp src-tauri/target/release/kydev /usr/local/bin/kydev
success "Global binary replaced."

echo -e "\n${B_GREEN}✨ UPGRADE COMPLETE! ✨${NC}"
echo -e "${B_CYAN}Please restart KyDev to experience the new features.${NC}\n"

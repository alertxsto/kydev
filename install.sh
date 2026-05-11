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
typewriter "       :: THE ULTIMATE LINUX DEVELOPER TOOLBOX ::" 0.01
echo -e " ${B_YELLOW}═════════════════════════════════════════════════════════${NC}\n"

OS_NAME=$(cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME" | cut -d "=" -f 2 | tr -d '"' || echo "Linux")
echo -e " ${B_CYAN}❖ OS:${NC}   $OS_NAME"
echo -e " ${B_CYAN}❖ ARCH:${NC} $(uname -m)"
echo -e " ${B_CYAN}❖ NODE:${NC} $(node -v 2>/dev/null || echo 'Not installed')"
echo -e " ${B_CYAN}❖ RUST:${NC} $(cargo -V 2>/dev/null || echo 'Not installed')\n"

read -p "$(echo -e "${B_MAGENTA}[?] Initiate KyDev Forging Sequence? [Y/n]: ${NC}")" choice
case "$choice" in 
  n|N ) echo -e "\n${B_RED}Sequence aborted.${NC}"; exit 0;;
  * ) echo "";;
esac

info "Initializing System Payload"
step "Downloading native dependencies via DNF..."
sudo dnf install -y webkit2gtk4.1-devel curl wget openssl-devel libappindicator-gtk3-devel librsvg2-devel > /dev/null 2>&1
success "All system dependencies locked and loaded."

info "Cloning Remote Repository"
step "Connecting to GitHub.com/alertxsto/kydev..."
rm -rf ~/.kydev
git clone https://github.com/alertxsto/kydev.git ~/.kydev 2>&1 | sed -e "s/^/    ${B_MAGENTA}│${NC}  /"
success "Source code successfully assimilated to ~/.kydev."

cd ~/.kydev

info "Mapping Node.js Packages"
step "Executing npm install in silent mode..."
npm install > /dev/null 2>&1
success "NPM registry synced."

info "Forging Rust Binary"
step "Initiating Tauri build engine (Expect heavy log stream) ☕..."
# Stream the build output with a cool sidebar so the user doesn't get bored
npm run tauri build 2>&1 | sed -e "s/^/    ${B_YELLOW}│${NC}  /"
success "Rust binary compiled successfully."

info "Elevating Privileges"
step "Moving binary to /usr/local/bin for global access..."
sudo cp src-tauri/target/release/kydev /usr/local/bin/kydev
success "Global execution access granted."

echo -e "\n${B_GREEN}   ╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${B_GREEN}   ║ ✨ BOOM! KYDEV HAS BEEN SUCCESSFULLY INSTALLED! ✨ ║${NC}"
echo -e "${B_GREEN}   ╚═══════════════════════════════════════════════════╝${NC}"
echo -e "\n${B_CYAN}   ▶ Run ${B_MAGENTA}kydev${B_CYAN} in your terminal to awaken the toolbox.${NC}\n"

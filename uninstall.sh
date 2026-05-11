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

clear
echo -e "${B_RED}"
cat << "EOF"
██╗  ██╗██╗   ██╗██████╗ ███████╗██╗   ██╗
██║ ██╔╝╚██╗ ██╔╝██╔══██╗██╔════╝██║   ██║
█████╔╝  ╚████╔╝ ██║  ██║█████╗  ██║   ██║
██╔═██╗   ╚██╔╝  ██║  ██║██╔══╝  ╚██╗ ██╔╝
██║  ██╗   ██║   ██████╔╝███████╗ ╚████╔╝ 
╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚══════╝  ╚═══╝  
EOF
echo -e "${NC}"
typewriter "       :: KYDEV UNINSTALLATION SEQUENCE ::" 0.01
echo -e " ${B_YELLOW}═════════════════════════════════════════════════════════${NC}\n"

read -p "$(echo -e "${B_RED}[!] Are you sure you want to permanently obliterate KyDev? [y/N]: ${NC}")" choice
case "$choice" in 
  y|Y ) echo "";;
  * ) echo -e "\n${B_CYAN}Aborting. KyDev lives another day!${NC}"; exit 0;;
esac

info "Target: Global Binary & Launcher"
step "Removing /usr/local/bin/kydev..."
sudo rm -f /usr/local/bin/kydev
step "Removing App Launcher..."
sudo rm -f /usr/share/applications/kydev.desktop
sudo rm -f /usr/share/pixmaps/kydev.png
sudo update-desktop-database /usr/share/applications || true
success "System integration eradicated."

info "Target: Source Files"
step "Wiping ~/.kydev directory..."
rm -rf ~/.kydev
success "Workspace vaporized."

echo -e "\n${B_RED}   ╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${B_RED}   ║      KyDev has been successfully uninstalled.     ║${NC}"
echo -e "${B_RED}   ╚═══════════════════════════════════════════════════╝${NC}"
echo -e "\n${B_CYAN}   We're sad to see you go! If you ever want to return, you know where to find us. 🚀${NC}\n"

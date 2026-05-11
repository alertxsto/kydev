#!/bin/bash
set -e

# Dank Colors
B_MAGENTA='\033[1;35m'
B_CYAN='\033[1;36m'
B_GREEN='\033[1;32m'
B_YELLOW='\033[1;33m'
B_RED='\033[1;31m'
NC='\033[0m'

# Spinner function
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
warning() { echo -e "${B_YELLOW}[!]${NC} $1"; }

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
echo -e " ${B_CYAN}:: The Ultimate Developer Toolbox for Fedora ::${NC}"
echo -e " ${B_YELLOW}---------------------------------------------${NC}\n"

# System check
OS_NAME=$(cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME" | cut -d "=" -f 2 | tr -d '"' || echo "Linux")
echo -e " ${B_CYAN}OS:${NC} $OS_NAME"
echo -e " ${B_CYAN}ARCH:${NC} $(uname -m)"
echo -e " ${B_CYAN}NODE:${NC} $(node -v 2>/dev/null || echo 'Not installed')"
echo -e " ${B_CYAN}RUST:${NC} $(cargo -V 2>/dev/null || echo 'Not installed')\n"

read -p "$(echo -e "${B_MAGENTA}[?] Ready to forge KyDev? [Y/n]: ${NC}")" choice
case "$choice" in 
  n|N ) echo "Aborting."; exit 0;;
  * ) echo "";;
esac

info "Installing core system dependencies..."
sudo dnf install -y webkit2gtk4.1-devel curl wget openssl-devel libappindicator-gtk3-devel librsvg2-devel > /dev/null 2>&1 & spinner
success "Dependencies forged."

info "Cloning KyDev Repository..."
rm -rf ~/.kydev
git clone https://github.com/alertxsto/kydev.git ~/.kydev > /dev/null 2>&1 & spinner
success "Repository acquired."

cd ~/.kydev

info "Installing Node modules..."
npm install > /dev/null 2>&1 & spinner
success "Node modules installed."

info "Compiling Rust Backend (This will take a while) ☕..."
npm run tauri build > build.log 2>&1 & spinner
success "Rust binary forged."

info "Elevating privileges to install globally..."
sudo cp src-tauri/target/release/kydev /usr/local/bin/kydev
success "Binary mapped to /usr/local/bin."

echo -e "\n${B_GREEN}✨ BOOM! KYDEV HAS BEEN SUCCESSFULLY INSTALLED! ✨${NC}"
echo -e "${B_CYAN}Run ${B_MAGENTA}kydev${B_CYAN} in your terminal to begin.${NC}\n"


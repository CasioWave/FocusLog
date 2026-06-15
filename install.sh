#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Attempt to load nvm or bash profile so npm is in PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc"

echo "Installing FocusLog Server dependencies..."
cd "$DIR/server"
npm install

echo "Installing FocusLog Client dependencies..."
cd "$DIR/client"
npm install

echo "Building FocusLog React Client..."
npm run build

echo "Creating Desktop Entry..."
DESKTOP_FILE="$HOME/.local/share/applications/focuslog.desktop"
mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=FocusLog
Comment=Material Design Study Time Tracker
Exec=$DIR/run.sh
Icon=utilities-terminal
Terminal=false
Categories=Utility;Education;
EOF

chmod +x "$DIR/run.sh"
chmod +x "$DIR/autostart.sh"
chmod +x "$DESKTOP_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications"
fi

echo "FocusLog has been successfully installed to your application menu!"
echo "You can launch it from your desktop environment, or run ./run.sh manually."

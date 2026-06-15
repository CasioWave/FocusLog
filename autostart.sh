#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/focuslog.desktop"

mkdir -p "$AUTOSTART_DIR"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=FocusLog Background Server
Comment=Start FocusLog server on boot
Exec=$DIR/run.sh --no-browser
Icon=utilities-terminal
Terminal=false
Categories=Utility;Education;
X-GNOME-Autostart-enabled=true
EOF

chmod +x "$DESKTOP_FILE"

echo "FocusLog has been configured to start automatically on login."
echo "It will run silently in the background. You can open the dashboard in your browser manually at http://localhost:3001"

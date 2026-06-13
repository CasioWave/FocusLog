#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if it's the first run and install dependencies
if [ ! -d "$DIR/server/node_modules" ]; then
    echo "First time setup: Installing server dependencies..."
    cd "$DIR/server" && npm install
    
    echo "Installing client dependencies and building..."
    cd "$DIR/client" && npm install && npm run build
    
    echo "Setup complete!"
fi

cd "$DIR/server"
echo "Starting FocusLog server..."
node index.js &
SERVER_PID=$!

sleep 2
xdg-open "http://localhost:3001"

echo "FocusLog is running on http://localhost:3001"
echo "Press Ctrl+C to stop the server."

wait $SERVER_PID

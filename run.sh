#!/bin/bash
# Attempt to load nvm or bash profile so node is in PATH
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/server"

node index.js &
SERVER_PID=$!

if [ "$1" != "--no-browser" ]; then
    sleep 2
    xdg-open "http://localhost:3001"
fi

wait $SERVER_PID

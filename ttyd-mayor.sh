#!/bin/sh
# Attach to the Mayor tmux session, or start one if it doesn't exist.
# Used by ttyd to provide a browser-based Mayor terminal.
if tmux has-session -t hq-mayor 2>/dev/null; then
    exec tmux attach-session -t hq-mayor
else
    exec /app/gastown/gt mayor attach
fi

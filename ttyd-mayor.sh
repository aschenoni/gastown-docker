#!/bin/sh
# Attach to the Mayor tmux session, or fall back to a shell.
# Used by ttyd to provide a browser-based terminal.
if tmux has-session -t hq-mayor 2>/dev/null; then
    exec tmux attach-session -t hq-mayor
else
    echo "Mayor session not running. Use 'gt up' to start services."
    echo ""
    exec zsh
fi

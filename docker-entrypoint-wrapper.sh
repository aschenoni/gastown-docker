#!/bin/sh
# Runs as root, fixes SSH socket permissions, then drops to agent user.
set -e

# Fix SSH agent socket permissions if it exists
if [ -S /run/host-services/ssh-auth.sock ]; then
    chmod 666 /run/host-services/ssh-auth.sock
fi

# Drop to agent user with a full login environment.
# Using su -l ensures HOME, USER, UID are all set correctly so that
# gt, tmux, and dolt all use /tmp/tmux-1000/ (agent's UID) consistently.
exec su -l agent -s /bin/sh -c "cd /gt && /app/docker-entrypoint.sh $*"

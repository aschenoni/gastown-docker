#!/bin/sh
# Runs as root, fixes SSH socket permissions, then drops to agent user.
set -e

# Fix SSH agent socket permissions if it exists
if [ -S /run/host-services/ssh-auth.sock ]; then
    chmod 666 /run/host-services/ssh-auth.sock
fi

# Drop to agent user and run the real entrypoint with all arguments
exec su -s /bin/sh agent -- /app/docker-entrypoint.sh "$@"

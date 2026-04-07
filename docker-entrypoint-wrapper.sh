#!/bin/sh
# Runs as root, fixes SSH socket permissions, then drops to agent user.
set -e

# Fix SSH agent socket permissions if it exists
if [ -S /run/host-services/ssh-auth.sock ]; then
    chmod 666 /run/host-services/ssh-auth.sock
fi

# Ensure volume mount points are owned by agent (uid 1000).
# Docker creates volume roots as root; this fixes ownership on first
# start and recovers from any root-owned files left by prior runs.
chown -R agent:agent /gt /home/agent

# Drop to agent user with a full login environment.
# Using su -l ensures HOME, USER, UID are all set correctly so that
# gt, tmux, and dolt all use /tmp/tmux-1000/ (agent's UID) consistently.
exec su -l agent -s /bin/sh -c "export GIT_USER='$GIT_USER' GIT_EMAIL='$GIT_EMAIL' && cd /gt && /app/docker-entrypoint.sh $*"

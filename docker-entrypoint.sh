#!/bin/sh
set -e

# Re-apply git/dolt config on every start so env var changes take effect
# even when the home volume already exists from a previous run.
if [ -n "$GIT_USER" ] && [ -n "$GIT_EMAIL" ]; then
    git config --global user.name "$GIT_USER"
    git config --global user.email "$GIT_EMAIL"
    git config --global credential.helper store
    dolt config --global --add user.name "$GIT_USER"
    dolt config --global --add user.email "$GIT_EMAIL"
fi

# Register "agent" as a custom bd issue type (removed from beads core,
# but required by gt sling for polecat tracking beads).
bd config set types.custom "agent" 2>/dev/null || true

if [ ! -f /gt/mayor/town.json ]; then
    echo "Initializing Gas Town workspace at /gt..."
    /app/gastown/gt install /gt --git
else
    echo "Refreshing Gas Town workspace at /gt..."
    /app/gastown/gt install /gt --git --force
fi

# Install custom formulas into the town workspace
FORMULA_DIR="/gt/.beads/formulas"
CUSTOM_DIR="/app/custom-formulas"
if [ -d "$CUSTOM_DIR" ] && [ "$(ls -A "$CUSTOM_DIR" 2>/dev/null)" ]; then
    mkdir -p "$FORMULA_DIR"
    installed=0
    for f in "$CUSTOM_DIR"/*.formula.toml; do
        [ -f "$f" ] || continue
        name="$(basename "$f")"
        if [ ! -f "$FORMULA_DIR/$name" ] || ! cmp -s "$f" "$FORMULA_DIR/$name"; then
            cp "$f" "$FORMULA_DIR/$name"
            installed=$((installed + 1))
        fi
    done
    if [ "$installed" -gt 0 ]; then
        echo "Installed $installed custom formula(s) into $FORMULA_DIR"
    fi
fi

# Install custom plugins into the town workspace
PLUGIN_DIR="/gt/plugins"
CUSTOM_PLUGIN_DIR="/app/custom-plugins"
if [ -d "$CUSTOM_PLUGIN_DIR" ] && [ "$(ls -A "$CUSTOM_PLUGIN_DIR" 2>/dev/null)" ]; then
    installed_plugins=0
    for plugin_src in "$CUSTOM_PLUGIN_DIR"/*/; do
        [ -d "$plugin_src" ] || continue
        plugin_name="$(basename "$plugin_src")"
        plugin_dest="$PLUGIN_DIR/$plugin_name"
        mkdir -p "$plugin_dest"
        for f in "$plugin_src"*; do
            [ -f "$f" ] || continue
            fname="$(basename "$f")"
            if [ ! -f "$plugin_dest/$fname" ] || ! cmp -s "$f" "$plugin_dest/$fname"; then
                cp "$f" "$plugin_dest/$fname"
                installed_plugins=$((installed_plugins + 1))
            fi
        done
    done
    if [ "$installed_plugins" -gt 0 ]; then
        echo "Installed/updated $installed_plugins custom plugin file(s) into $PLUGIN_DIR"
    fi
fi

# Apply Claude Code settings (disable unnecessary plugins to save tokens)
echo "Applying Claude Code settings..."
/app/custom-settings/apply-settings.sh /app/custom-settings /gt 2>&1 || true

# Start Dolt (needed for dashboard even if Claude isn't authenticated yet)
echo "Starting Dolt..."
/app/gastown/gt dolt start 2>&1 || true

# Build cost tier flags for gt up
GT_UP_FLAGS=""
if [ -n "$GT_COST_TIER" ]; then
    GT_UP_FLAGS="--cost-tier $GT_COST_TIER"
    echo "Using cost tier: $GT_COST_TIER"
fi

# Try to start full Gas Town services — may fail if Claude isn't authenticated
echo "Starting Gas Town services..."
/app/gastown/gt up $GT_UP_FLAGS 2>&1 || echo "Warning: gt up failed (run 'claude login' then 'gt up' to complete setup)"

# Start dashboard on port 8080 (background)
echo "Starting dashboard on :8080..."
/app/gastown/gt dashboard --port 8080 --bind 0.0.0.0 &

# Start ttyd terminal on port 7681 (background)
echo "Starting terminal on :7681..."
ttyd -p 7681 -W /app/ttyd-mayor.sh &

echo "All services started."
echo "  Dashboard: http://localhost:8080"
echo "  Terminal:  http://localhost:7681"

# Keep container alive and forward signals
exec "$@"

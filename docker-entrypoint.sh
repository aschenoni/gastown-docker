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

exec "$@"

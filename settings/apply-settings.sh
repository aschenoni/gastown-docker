#!/bin/sh
# Apply Claude Code settings to all Gas Town agent .claude/settings.json files.
# Called by docker-entrypoint.sh and gt-docker settings sync.
#
# Merges disabled-plugins.json into every agent's enabledPlugins map,
# preserving existing hooks and other settings.
set -e

SETTINGS_SRC="${1:-/app/custom-settings}"
TOWN_ROOT="${2:-/gt}"

DISABLED_PLUGINS="$SETTINGS_SRC/disabled-plugins.json"

if [ ! -f "$DISABLED_PLUGINS" ]; then
    echo "No disabled-plugins.json found, skipping plugin settings."
    exit 0
fi

# Find all agent settings files under the town root
updated=0
for settings_file in $(find "$TOWN_ROOT" -path '*/.claude/settings.json' -not -path '*/node_modules/*' 2>/dev/null); do
    if [ ! -f "$settings_file" ]; then
        continue
    fi

    # Use python3 (available in the base image) to merge plugins into settings
    python3 -c "
import json, sys

settings_path = sys.argv[1]
plugins_path = sys.argv[2]

with open(settings_path) as f:
    settings = json.load(f)

with open(plugins_path) as f:
    raw = json.load(f)

# Filter out _comment keys
disabled = {k: v for k, v in raw.items() if not k.startswith('_')}

plugins = settings.get('enabledPlugins', {})
changed = False
for plugin_id, enabled in disabled.items():
    if plugins.get(plugin_id) != enabled:
        plugins[plugin_id] = enabled
        changed = True

if changed:
    settings['enabledPlugins'] = plugins
    with open(settings_path, 'w') as f:
        json.dump(settings, f, indent=2)
        f.write('\n')
    print(f'  Updated: {settings_path}')
else:
    print(f'  Unchanged: {settings_path}')
" "$settings_file" "$DISABLED_PLUGINS"
    updated=$((updated + 1))
done

if [ "$updated" -eq 0 ]; then
    echo "  No agent settings files found yet (agents may not have started)."
else
    echo "  Processed $updated settings file(s)."
fi

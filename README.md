# gastown-docker

Run multiple isolated [Gas Town](https://github.com/steveyegge/gastown) instances in Docker containers. Each instance gets its own town workspace, home directory, dashboard, and browser-based terminal — fully isolated from each other and your host machine.

## Prerequisites

- **Docker Desktop** (macOS) or **Docker Engine** (Linux)
- **SSH key** loaded in your SSH agent (for GitHub access inside containers)
- **Caddy** (for friendly `.town` URLs) — `brew install caddy`

## Quick Start

```bash
# Clone this repo
git clone https://github.com/aschenoni/gastown-docker.git
cd gastown-docker

# Make the CLI executable and symlink it onto your PATH
chmod +x gt-docker
ln -sf "$(pwd)/gt-docker" ~/.local/bin/gt-docker   # or /usr/local/bin/

# Spin up your first instance
gt-docker up mytown

# Shell in, authenticate Claude, and initialize
gt-docker shell mytown
claude login          # one-time OAuth login (opens browser)
gt up                 # initialize the Gas Town workspace
gt mayor attach       # start the Mayor
```

## Friendly URLs

Set up local DNS and a reverse proxy so each instance is accessible at `<name>.town` in your browser.

### 1. Add hosts entries

```bash
sudo sh -c 'cat >> /etc/hosts << EOF

# Gas Town Docker instances
127.0.0.1	mytown.town
127.0.0.1	terminal.mytown.town
EOF'
```

Add a pair of lines for each instance you create.

### 2. Configure ports

Create a `ports.conf` file to assign static ports for each instance:

```bash
cp ports.conf.example ports.conf
```

Then edit `ports.conf`:

```conf
mytown.dashboard=8081
mytown.terminal=7681
```

### 3. Configure Caddy

Edit the `Caddyfile` to add routes for each instance:

```caddyfile
mytown.town:80 {
    reverse_proxy localhost:8081
}

terminal.mytown.town:80 {
    reverse_proxy localhost:7681
}
```

### 4. Start Caddy

```bash
sudo caddy start --config /path/to/gastown-docker/Caddyfile
```

Reload after editing the Caddyfile:

```bash
sudo caddy reload --config /path/to/gastown-docker/Caddyfile
```

### Result

| Instance | Dashboard | Terminal (Mayor) |
|----------|-----------|------------------|
| mytown | http://mytown.town | http://terminal.mytown.town |

## Usage

### Create instances

Spin up as many isolated towns as you like. Each one is independent.

```bash
gt-docker up alpha
gt-docker up bravo
gt-docker up charlie
```

### Attach to the Mayor

From the command line:

```bash
gt-docker mayor alpha
```

Or in the browser (if ttyd and Caddy are configured):

```
http://terminal.alpha.town
```

### Start the dashboard and terminal

The dashboard and browser terminal need to be started inside each container:

```bash
# Dashboard (serves on port 8080 inside the container)
gt-docker exec mytown gt dashboard &

# Browser terminal — launches ttyd with smart Mayor attach
gt-docker exec mytown ttyd -p 7681 -W /app/ttyd-mayor.sh &
```

These run in the background. The Caddy reverse proxy makes them available at `mytown.town` and `terminal.mytown.town`.

### Other commands

```bash
gt-docker list                     # list all running instances
gt-docker shell <instance>         # open a zsh shell
gt-docker exec <instance> <cmd>    # run a command (e.g. gt agents)
gt-docker logs <instance>          # tail container logs
gt-docker down <instance>          # stop (keeps data in volumes)
gt-docker destroy <instance>       # stop and delete all data
```

## Syncing Memories Between Instances

Gas Town stores agent memories in multiple places. The `gt-docker memory` commands let you export, import, and sync memories between instances.

### What Gets Synced

- **bd kv store** — Agent memories with `memory.*` prefix (feedback, user context, project context, references)
- **Claude Code memory** — Files in `~/.claude/projects/*/memory/`
- **Brainstorm artifacts** — Markdown files in `/gt/.brainstorms/`

### Memory Commands

```bash
# Export memories from an instance to a file
gt-docker memory export alpha memories-alpha.tar.gz

# Import memories from a file into an instance
gt-docker memory import bravo memories-alpha.tar.gz

# Sync memories directly between instances
gt-docker memory sync alpha bravo              # alpha → bravo

# List what memories exist in an instance
gt-docker memory list alpha
```

### Example Workflow

```bash
# Create two instances
gt-docker up alpha
gt-docker up bravo

# Work in alpha, add some memories
gt-docker exec alpha gt remember "API rate limit is 1000 req/min"
gt-docker exec alpha gt remember --type feedback "Always use batch endpoints for bulk operations"

# Sync memories from alpha to bravo
gt-docker memory sync alpha bravo

# Verify they're now in bravo
gt-docker memory list bravo
```

### Conflict Handling

When importing memories, if a key already exists with a different value, you'll be prompted:

```
⚠️  Conflicts detected:

  Key: memory.feedback.api-usage
    Existing: Use REST API v1...
    Import:   Use GraphQL API v2...

  Keep [e]xisting, import [n]ew, or [s]kip?
```

This ensures you never accidentally overwrite important memories.

## How It Works

### Isolation

Each instance is namespaced via `COMPOSE_PROJECT_NAME`, giving it:
- Its own Docker volume for `/gt` (the town workspace)
- Its own Docker volume for `/home/agent` (Claude credentials, shell history, etc.)
- Its own container named `gastown-<instance>`

Instances share nothing with each other.

### SSH Agent Forwarding

Your host SSH agent is forwarded into every container via the Docker Desktop macOS socket (`/run/host-services/ssh-auth.sock`). This means containers can `git clone` and `git pull` from private GitHub repos using your SSH key, without copying any keys into the container.

Verify it's working:

```bash
gt-docker exec mytown ssh-add -l
```

### Claude Authentication

Each container needs a one-time `claude login` to authenticate. The OAuth token is stored in the container's persistent home volume, so it survives container restarts.

```bash
gt-docker shell mytown
claude login
```

### Git Identity

Set your git identity via environment variables:

```bash
GIT_USER="Your Name" GIT_EMAIL="you@example.com" gt-docker up mytown
```

Defaults to `TestUser` / `test@example.com` if not set.

## File Overview

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Compose template for isolated instances |
| `gt-docker` | CLI wrapper for managing instances |
| `ports.conf` | Static port assignments per instance |
| `Caddyfile` | Reverse proxy config for `.town` URLs |
| `docker-entrypoint.sh` | Container init (git/dolt config, town setup) |
| `docker-entrypoint-wrapper.sh` | Root wrapper (SSH socket fix, drops to agent) |
| `ttyd-mayor.sh` | Browser terminal Mayor attach script |

The Dockerfile clones and builds [Gas Town](https://github.com/steveyegge/gastown) from source at build time.

## Linux Notes

On Linux, the SSH agent socket path is different. Update the volume mount in `docker-compose.yml`:

```yaml
volumes:
  - ${SSH_AUTH_SOCK}:/run/host-services/ssh-auth.sock
```

And set `SSH_AUTH_SOCK` in your environment before running `gt-docker up`.

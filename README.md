# gastown-docker

Run multiple isolated [Gas Town](https://github.com/steveyegge/gastown) instances in Docker containers. Each instance gets its own town workspace, home directory, dashboard, and browser-based terminal — fully isolated from each other and your host machine.

## What is Gas Town?

[Gas Town](https://github.com/steveyegge/gastown) is an AI-powered software development framework built on Claude. It orchestrates multiple AI agents working together on software projects through a structured workflow system.

### Key Components

**Mayor** — The executive agent that coordinates all work. The Mayor receives requests, delegates to workers, reviews outputs, and makes decisions. You interact with the Mayor through a tmux session (terminal or browser-based).

**Workers** — Specialized AI agents that execute specific tasks (coding, testing, research, documentation). Workers are dispatched by the Mayor and report back when complete.

**Dashboard** — Web UI (port 8080) showing real-time project state: active beads (tasks), agent status, git activity, and metrics. Think of it as mission control.

**Beads** — The core work unit in Gas Town. Each bead tracks a single task through its lifecycle (brainstorm → spec → implementation → PR → merge). Beads are stored in a Dolt database for full version history.

**Dogs** — Autonomous patrol agents that run on schedules. They monitor project health, triage stale work, refresh metrics, and report only when action is needed. Silence = healthy.

**Formulas** — Reusable workflow templates that define multi-step processes (e.g., "spec-lifecycle" guides a feature from design through shipping).

### How It Works

You chat with the Mayor in natural language. The Mayor breaks down your request, creates beads to track work, dispatches workers, reviews their output, handles git operations, and keeps you updated. The dashboard shows what's happening across all parallel work streams.

This Docker wrapper lets you run multiple isolated Gas Town instances simultaneously — useful for working on different projects, testing configurations, or running parallel experiments.

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

## Demo and Exploration

A demonstration script (`demo-script.sh`) is included for recording walkthroughs with asciinema. It provides structured segments covering setup, CLI usage, formulas, multi-instance management, and troubleshooting.

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

## Custom Formulas and Plugins

This repo includes curated formulas and plugins that extend Gas Town:

**Formulas** (workflow templates):
- `mol-brainstorm` — open-ended exploration before spec writing
- `mol-spec-lifecycle` — full feature lifecycle from spec to shipped
- `mol-pr-lifecycle` — automated PR workflow for single tasks
- `mol-project-pulse` — strategic project health assessment
- `mol-wrap-up` — post-completion cleanup and docs

**Plugins** (autonomous patrol agents):
- `brainstorm-review` — weekly triage of stale brainstorm beads
- `pulse-refresh` — keep project metrics current

See [FORMULAS.md](FORMULAS.md) for detailed documentation on each formula and plugin, including usage examples and how to create your own.

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
| `formulas/` | Custom workflow templates |
| `plugins/` | Autonomous patrol agent plugins |
| `settings/` | Claude Code plugin configuration |

The Dockerfile clones and builds [Gas Town](https://github.com/steveyegge/gastown) from source at build time.

## Troubleshooting

### Claude Authentication Fails

**Problem:** `claude login` opens browser but authentication doesn't complete, or you see "authentication failed" errors.

**Solutions:**
- Ensure you're logged into the correct Claude account in your browser
- Try `gt-docker shell mytown` then run `claude login` again
- Check the OAuth callback works: `curl -I http://localhost:5173`
- Clear credentials and retry: `rm -rf ~/.anthropic` inside the container

### SSH Key Not Working

**Problem:** Git operations fail with "permission denied" or "no such identity" errors.

**Solutions:**
- Verify SSH agent is running on host: `ssh-add -l`
- Check socket is mounted: `gt-docker exec mytown ls -l /run/host-services/ssh-auth.sock`
- Test inside container: `gt-docker exec mytown ssh-add -l`
- On Linux, ensure `SSH_AUTH_SOCK` is set before running `gt-docker up`
- For non-standard SSH socket locations, set `SSH_AUTH_SOCK_PATH` env var or update `docker-compose.yml`

### Port Conflicts

**Problem:** "port already in use" or "cannot start container" errors.

**Solutions:**
- Check what's using the port: `lsof -i :8081` or `docker ps --format "table {{.Names}}\t{{.Ports}}"`
- Create `ports.conf` with unique ports per instance (see `ports.conf.example`)
- Stop conflicting services or use different ports
- For web app ports, adjust `WEB_PORTS` env var: `WEB_PORTS=4000-4050:3000-3050 gt-docker up mytown`

### Gas Town Services Won't Start

**Problem:** Container runs but `gt up` fails, or Mayor won't attach.

**Solutions:**
- First-time setup requires authentication: `gt-docker shell mytown`, then `claude login`, then `gt up`
- Check service status: `gt-docker exec mytown gt status`
- View logs: `gt-docker logs mytown`
- Restart services: `gt-docker exec mytown gt stop && gt-docker exec mytown gt up`
- Check cost tier if you hit rate limits: `gt-docker tier mytown` (use `budget` to reduce costs)

### Dashboard or Terminal Not Accessible

**Problem:** Browser shows "connection refused" or "site can't be reached".

**Solutions:**
- Verify services are running: `gt-docker exec mytown ps aux | grep -E 'gt dashboard|ttyd'`
- Check port mappings: `docker ps --filter name=gastown-mytown --format "{{.Ports}}"`
- Ensure Caddy is running: `sudo caddy stop --config /path/to/Caddyfile && sudo caddy start --config /path/to/Caddyfile`
- Verify `/etc/hosts` has entries: `grep mytown.town /etc/hosts`
- Access directly via ports: `http://localhost:8081` (dashboard), `http://localhost:7681` (terminal)

### Container Exits Immediately

**Problem:** `gt-docker up` succeeds but container stops right away.

**Solutions:**
- Check logs for errors: `gt-docker logs mytown`
- Verify Docker has enough resources (4GB+ RAM recommended)
- Look for entrypoint failures: `docker logs gastown-mytown 2>&1 | grep -i error`
- Try rebuilding: `gt-docker down mytown && gt-docker up mytown`

### Git Operations Inside Container Fail

**Problem:** `git clone` or `git push` fails with authentication errors.

**Solutions:**
- Verify SSH key is loaded in host agent: `ssh-add -l`
- Test GitHub access from container: `gt-docker exec mytown ssh -T git@github.com`
- Check git config: `gt-docker exec mytown git config --list`
- Set git identity if missing: `GIT_USER="Your Name" GIT_EMAIL="you@example.com" gt-docker up mytown`

### Volumes Not Persisting

**Problem:** Data disappears after container restart.

**Solutions:**
- Don't use `gt-docker destroy` unless you want to delete data — use `gt-docker down` instead
- Check volumes exist: `docker volume ls | grep gt-mytown`
- Inspect volume mounts: `docker inspect gastown-mytown | grep -A 10 Mounts`

### High Token Usage / Rate Limits

**Problem:** Running out of tokens or hitting rate limits quickly.

**Solutions:**
- Switch to budget tier: `gt-docker tier mytown budget`
- Check which plugins are enabled: `gt-docker settings show`
- Disable unnecessary plugins in `settings/disabled-plugins.json`, then sync: `gt-docker settings sync --all`
- Limit parallel agents in Gas Town dashboard

## Linux Notes

On Linux, the SSH agent socket path is different. Update the volume mount in `docker-compose.yml`:

```yaml
volumes:
  - ${SSH_AUTH_SOCK}:/run/host-services/ssh-auth.sock
```

And set `SSH_AUTH_SOCK` in your environment before running `gt-docker up`.

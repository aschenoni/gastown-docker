# gastown-docker

Run multiple isolated [Gas Town](https://github.com/steveyegge/gastown) instances in Docker containers. Each instance gets its own town workspace, home directory, and dashboard — fully isolated from each other and your host machine.

## Prerequisites

- **Docker Desktop** (macOS) or **Docker Engine** (Linux)
- **SSH key** loaded in your SSH agent (for GitHub access inside containers)

## Quick Start

```bash
# Clone this repo
git clone https://github.com/ajoynern/gastown-docker.git
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

## Usage

### Create instances

Spin up as many isolated towns as you like. Each one is independent.

```bash
gt-docker up alpha
gt-docker up bravo
gt-docker up charlie
```

### Attach to the Mayor

From anywhere on your machine:

```bash
gt-docker mayor alpha
```

This connects to the Mayor's tmux session inside the container. If no Mayor session exists yet, it starts one.

### Other commands

```bash
gt-docker list                     # list all running instances
gt-docker shell <instance>         # open a zsh shell
gt-docker exec <instance> <cmd>    # run a command (e.g. gt agents)
gt-docker logs <instance>          # tail container logs
gt-docker down <instance>          # stop (keeps data in volumes)
gt-docker destroy <instance>       # stop and delete all data
```

### Dashboard

Each instance runs a web dashboard on an auto-assigned port. Start it inside the container:

```bash
gt-docker exec mytown gt dashboard
```

Then check `gt-docker list` to see which host port was assigned (the `PORTS` column).

To use a fixed port instead:

```bash
DASHBOARD_PORT=9090 gt-docker up mytown
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

## File Overview

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Compose template for isolated instances |
| `gt-docker` | CLI wrapper for managing instances |

The Dockerfile and entrypoint scripts are sourced from the [gastown repository](https://github.com/steveyegge/gastown) at build time.

## Linux Notes

On Linux, the SSH agent socket path is different. Update the volume mount in `docker-compose.yml`:

```yaml
volumes:
  - ${SSH_AUTH_SOCK}:/run/host-services/ssh-auth.sock
```

And set `SSH_AUTH_SOCK` in your environment before running `gt-docker up`.

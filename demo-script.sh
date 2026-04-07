#!/usr/bin/env bash
#
# Demo script for asciinema recording of gastown-docker setup and usage.
#
# Usage:
#   1. Install asciinema: brew install asciinema
#   2. Run this script: ./demo-script.sh
#   3. Follow the prompts to record each segment
#   4. Upload recordings: asciinema upload demo-<segment>.cast
#   5. Embed in README or share links
#
# This script provides a framework for recording multiple demo segments.
# You can run them all at once or record individually.
#
set -euo pipefail

DEMO_INSTANCE="demotown"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_info() {
    echo -e "${GREEN}▶${NC} $1"
}

print_prompt() {
    echo -e "${YELLOW}$1${NC}"
}

pause() {
    print_prompt "\nPress ENTER to continue..."
    read -r
}

cleanup_demo() {
    print_info "Cleaning up demo instance..."
    "$SCRIPT_DIR/gt-docker" destroy "$DEMO_INSTANCE" 2>/dev/null || true
}

# Segment 1: Initial Setup
record_setup() {
    print_section "Recording: Initial Setup"
    print_info "This segment shows: installation, first instance creation, authentication"
    pause

    cleanup_demo

    asciinema rec demo-01-setup.cast <<'DEMO1'
# gastown-docker Demo: Initial Setup

# Step 1: Make CLI executable and add to PATH
chmod +x gt-docker
ln -sf "$(pwd)/gt-docker" ~/.local/bin/gt-docker

# Step 2: Create your first instance
gt-docker up demotown

# The container starts with all services (Dolt, Mayor, Dashboard, Terminal)
# but Claude authentication is needed before full functionality

# Step 3: Shell into the instance
gt-docker shell demotown

# Inside the container, authenticate Claude (opens browser)
# Note: This will pause the recording - in real usage, complete OAuth flow
echo "Now you would run: claude login"
echo "This opens a browser for OAuth authentication"

# After authentication, initialize Gas Town
echo "Then run: gt up"
echo "This starts all Gas Town services with your authenticated Claude session"

# Exit the shell
exit

DEMO1

    print_info "Saved: demo-01-setup.cast"
}

# Segment 2: CLI Commands
record_commands() {
    print_section "Recording: CLI Commands Tour"
    print_info "This segment shows: listing instances, exec commands, mayor attach"
    pause

    asciinema rec demo-02-commands.cast <<'DEMO2'
# gastown-docker Demo: CLI Commands

# List all running instances
gt-docker list

# Check instance status from outside
gt-docker exec demotown gt status

# View running agents
gt-docker exec demotown gt agents

# Check dashboard health
gt-docker exec demotown curl -s http://localhost:8080/health

# Attach to the Mayor (the main interface for Gas Town)
echo "To interact with the Mayor, run:"
echo "  gt-docker mayor demotown"
echo ""
echo "Or in browser at: http://terminal.demotown.town"

DEMO2

    print_info "Saved: demo-02-commands.cast"
}

# Segment 3: Working with Formulas
record_formulas() {
    print_section "Recording: Custom Formulas and Plugins"
    print_info "This segment shows: listing formulas, syncing, using them"
    pause

    asciinema rec demo-03-formulas.cast <<'DEMO3'
# gastown-docker Demo: Formulas and Plugins

# View custom formulas and plugins
gt-docker formulas list

# Sync formulas to running instance
gt-docker formulas sync demotown

# Inside the container, see available formulas
gt-docker exec demotown gt formula list

# Search for specific formulas
gt-docker exec demotown bd formulas find brainstorm

# Example: Run the brainstorm formula
echo "To start a brainstorm session:"
echo "  gt-docker mayor demotown"
echo "  Then tell the Mayor: 'let's brainstorm database migration strategy'"

DEMO3

    print_info "Saved: demo-03-formulas.cast"
}

# Segment 4: Multi-Instance Setup
record_multi() {
    print_section "Recording: Multiple Instances"
    print_info "This segment shows: running multiple isolated instances"
    pause

    asciinema rec demo-04-multi.cast <<'DEMO4'
# gastown-docker Demo: Multiple Instances

# Create multiple isolated instances for different projects
gt-docker up project-alpha
gt-docker up project-bravo
gt-docker up experiment-1

# Each instance is completely isolated
gt-docker list

# Check tier settings across all instances
gt-docker tier --all

# Switch an instance to budget tier (lower cost)
gt-docker tier project-alpha budget

# Sync settings to all instances
gt-docker settings sync --all

# Work with specific instances
gt-docker exec project-alpha gt status
gt-docker exec project-bravo gt status

# Attach to specific instance's Mayor
echo "Work in different instances:"
echo "  gt-docker mayor project-alpha"
echo "  gt-docker mayor project-bravo"

DEMO4

    print_info "Saved: demo-04-multi.cast"
}

# Segment 5: Dashboard and Browser Terminal
record_web() {
    print_section "Recording: Web Dashboard and Terminal"
    print_info "This segment shows: accessing web interfaces, friendly URLs"
    pause

    asciinema rec demo-05-web.cast <<'DEMO5'
# gastown-docker Demo: Web Interfaces

# The dashboard and terminal are accessible via browser
echo "Web interfaces for demotown:"
echo "  Dashboard: http://demotown.town"
echo "  Terminal:  http://terminal.demotown.town"
echo ""

# Check that services are running
gt-docker exec demotown ps aux | grep -E 'gt dashboard|ttyd'

# View dashboard port mappings
docker ps --filter name=gastown-demotown --format "{{.Ports}}"

# The dashboard shows:
# - Active beads (tasks) and their status
# - Running agents
# - Git activity
# - Project metrics
# - Recent Mayor conversations

# The terminal provides:
# - Browser-based tmux session
# - Direct Mayor interaction
# - Mouse support (F12 to toggle)
# - Persistent sessions (survives disconnect)

echo ""
echo "Try opening these URLs in your browser to explore!"

DEMO5

    print_info "Saved: demo-05-web.cast"
}

# Segment 6: Troubleshooting
record_troubleshooting() {
    print_section "Recording: Troubleshooting Tips"
    print_info "This segment shows: common issues and solutions"
    pause

    asciinema rec demo-06-troubleshooting.cast <<'DEMO6'
# gastown-docker Demo: Troubleshooting

# Check container logs
gt-docker logs demotown | tail -20

# Verify SSH agent forwarding
gt-docker exec demotown ssh-add -l

# Test GitHub access
gt-docker exec demotown ssh -T git@github.com

# Check Gas Town service health
gt-docker exec demotown gt status

# Restart Gas Town services if needed
gt-docker exec demotown gt stop
gt-docker exec demotown gt up

# Check port conflicts
lsof -i :8081 | head -5

# View instance-specific volumes
docker volume ls | grep gt-demotown

# If things are really broken, rebuild
gt-docker down demotown
gt-docker up demotown

echo ""
echo "See README.md Troubleshooting section for more solutions"

DEMO6

    print_info "Saved: demo-06-troubleshooting.cast"
}

# Main menu
main() {
    cat <<EOF
${BLUE}gastown-docker Demo Recording Script${NC}

This script helps you record demonstration segments with asciinema.
Each segment can be recorded independently and uploaded to asciinema.org
or embedded in your documentation.

Prerequisites:
  - asciinema installed: brew install asciinema
  - gt-docker CLI in your PATH
  - Docker running

Segments:
  1) Initial Setup          - First-time setup and authentication
  2) CLI Commands          - Tour of gt-docker commands
  3) Formulas & Plugins    - Working with custom formulas
  4) Multiple Instances    - Running isolated instances
  5) Web Interfaces        - Dashboard and browser terminal
  6) Troubleshooting       - Common issues and fixes

  a) Record all segments
  c) Cleanup demo instance
  q) Quit

EOF

    read -p "Select option: " choice

    case $choice in
        1) record_setup ;;
        2) record_commands ;;
        3) record_formulas ;;
        4) record_multi ;;
        5) record_web ;;
        6) record_troubleshooting ;;
        a)
            record_setup
            record_commands
            record_formulas
            record_multi
            record_web
            record_troubleshooting
            ;;
        c) cleanup_demo ;;
        q) exit 0 ;;
        *)
            echo "Invalid option"
            exit 1
            ;;
    esac

    echo -e "\n${GREEN}✓ Recording complete${NC}"
    echo ""
    echo "To upload recordings:"
    echo "  asciinema upload demo-*.cast"
    echo ""
    echo "To play locally:"
    echo "  asciinema play demo-01-setup.cast"
    echo ""
    echo "To embed in README, add:"
    echo "  [![asciicast](https://asciinema.org/a/XXXXX.svg)](https://asciinema.org/a/XXXXX)"
}

# Check prerequisites
if ! command -v asciinema &> /dev/null; then
    echo -e "${YELLOW}Warning: asciinema not found${NC}"
    echo "Install it with: brew install asciinema"
    exit 1
fi

main

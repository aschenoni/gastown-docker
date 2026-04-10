# Memory Sync Implementation

## Overview

This feature adds the ability to export, import, and sync Gas Town memories between Docker instances. This is essential for:
- Sharing learnings between different project instances
- Backing up agent memories
- Migrating context when recreating instances
- Testing with pre-populated memory states

## Architecture

### What Gets Synced

The memory sync system handles three types of data:

1. **bd kv store** - Gas Town's key-value store containing agent memories
   - Location: Dolt database `config` table with `memory.*` prefix keys
   - Types: feedback, user, project, reference, general
   - Access: `bd kv list --json` to export, `bd kv set <key> <value>` to import

2. **Claude Code auto-memory** - Claude Code's session persistence
   - Location: `~/.claude/projects/*/memory/` directory
   - Format: Markdown files (MEMORY.md)
   - Contains: Claude Code's learned patterns and context

3. **Brainstorm artifacts** - Gas Town brainstorm session outputs
   - Location: `/gt/.brainstorms/` directory
   - Format: Markdown files (*-scratch.md, *-synthesis.md, *-decision.md)
   - Contains: Exploration notes and decision records

### Export Format

Memories are exported as a gzipped tarball with this structure:

```
memory-export.tar.gz
├── bd-kv.json              # bd kv list --json output
├── claude-memory/          # Contents of ~/.claude/projects/
│   └── <project-hash>/
│       └── memory/
│           ├── MEMORY.md
│           └── *.md
└── brainstorms/            # Contents of /gt/.brainstorms/
    ├── topic-scratch.md
    ├── topic-synthesis.md
    └── topic-decision.md
```

## CLI Commands

### gt-docker memory export

Exports all memories from an instance to a tar.gz file.

```bash
gt-docker memory export <instance> <output-file>

# Example:
gt-docker memory export alpha memories-alpha.tar.gz
```

**What it does:**
1. Runs `bd kv list --json` inside the container
2. Copies Claude memory files from `~/.claude/projects/`
3. Copies brainstorm artifacts from `/gt/.brainstorms/`
4. Creates a gzipped tarball with all data

### gt-docker memory import

Imports memories from a tar.gz file into an instance.

```bash
gt-docker memory import <instance> <input-file>

# Example:
gt-docker memory import bravo memories-alpha.tar.gz
```

**What it does:**
1. Extracts the tar.gz archive
2. Imports bd kv entries with conflict detection
3. Copies Claude memory files
4. Copies brainstorm artifacts

**Conflict Handling:**
When a bd kv key already exists with a different value, the user is prompted:

```
⚠️  Conflicts detected:

  Key: memory.feedback.api-usage
    Existing: Use REST API v1...
    Import:   Use GraphQL API v2...

  Keep [e]xisting, import [n]ew, or [s]kip?
```

Options:
- `e` - Keep existing value
- `n` - Overwrite with imported value  
- `s` - Skip this key

### gt-docker memory sync

Convenience wrapper that exports from source and imports to destination.

```bash
gt-docker memory sync <source-instance> <dest-instance>

# Example:
gt-docker memory sync alpha bravo    # alpha → bravo
```

Equivalent to:
```bash
gt-docker memory export alpha /tmp/temp.tar.gz
gt-docker memory import bravo /tmp/temp.tar.gz
rm /tmp/temp.tar.gz
```

### gt-docker memory list

Shows what memories exist in an instance.

```bash
gt-docker memory list <instance>

# Example:
gt-docker memory list alpha
```

**Output:**
```
Memories in instance 'alpha':

bd kv store:
  memory.feedback.api-usage: Use batch endpoints for bulk operations
  memory.project.current-work: Working on memory sync feature
  memory.user.expertise: Experienced Go engineer

Claude Code memory:
  .claude/projects/abc123/memory/MEMORY.md
  .claude/projects/abc123/memory/feedback_testing.md

Brainstorm artifacts:
  billing-migration-scratch.md
  billing-migration-synthesis.md
```

## Implementation Details

### Export Implementation (cmd_memory_export)

```bash
cmd_memory_export() {
    local instance="$1"
    local output_file="$2"
    local cname="$(container_name "$instance")"
    require_running "$instance"

    # Create temp directory
    tmpdir=$(mktemp -d)
    trap "rm -rf '$tmpdir'" EXIT

    # Export bd kv store
    docker exec "$cname" bd kv list --json > "$tmpdir/bd-kv.json" 2>/dev/null

    # Export Claude memory
    docker exec "$cname" sh -c 'tar czf - -C ~/.claude/projects . 2>/dev/null' \
        | tar xzf - -C "$tmpdir/claude-memory" 2>/dev/null

    # Export brainstorms
    docker exec "$cname" sh -c 'tar czf - -C /gt/.brainstorms . 2>/dev/null' \
        | tar xzf - -C "$tmpdir/brainstorms" 2>/dev/null

    # Create archive
    tar czf "$output_file" -C "$tmpdir" .
}
```

### Import Implementation (cmd_memory_import)

```bash
cmd_memory_import() {
    local instance="$1"
    local input_file="$2"
    local cname="$(container_name "$instance")"
    require_running "$instance"

    # Extract archive
    tmpdir=$(mktemp -d)
    tar xzf "$input_file" -C "$tmpdir"

    # Import bd kv with conflict handling (Python script)
    # Prompts user on conflicts: keep existing, import new, or skip

    # Import Claude memory
    tar czf - -C "$tmpdir/claude-memory" . \
        | docker exec -i "$cname" sh -c 'tar xzf - -C ~/.claude/projects'

    # Import brainstorms
    tar czf - -C "$tmpdir/brainstorms" . \
        | docker exec -i "$cname" sh -c 'tar xzf - -C /gt/.brainstorms'
}
```

### Conflict Resolution (Python)

Uses inline Python script to:
1. Parse existing and imported bd kv JSON
2. Detect conflicts (same key, different value)
3. Prompt user for each conflict
4. Execute `bd kv set` for non-conflicting and user-approved imports

## Testing

A test script is provided: `test-memory-sync.sh`

```bash
./test-memory-sync.sh
```

**Prerequisites:**
- At least 2 running Gas Town instances
- `bd` CLI available in containers
- Python 3 on host system

**What it tests:**
1. List memories in both instances (baseline)
2. Add test memories to source instance
3. Export memories to tar.gz
4. Import memories to destination instance
5. Verify memories appear in destination
6. Test direct sync command
7. Verify sync worked

## Usage Examples

### Example 1: Backup and Restore

```bash
# Backup memories from production instance
gt-docker memory export prod memories-backup-$(date +%Y%m%d).tar.gz

# Later, restore to a new instance
gt-docker up prod-new
gt-docker memory import prod-new memories-backup-20260409.tar.gz
```

### Example 2: Share Learnings Between Projects

```bash
# Export common learnings from one project
gt-docker memory export project-a common-learnings.tar.gz

# Import into other projects
gt-docker memory import project-b common-learnings.tar.gz
gt-docker memory import project-c common-learnings.tar.gz
```

### Example 3: Clone Instance State

```bash
# Create exact copy of instance state
gt-docker up dev
gt-docker up staging
gt-docker memory sync dev staging

# Now staging has all dev's memories
```

## Future Enhancements

Potential improvements not in current scope:

1. **Selective sync** - Filter by memory type
   ```bash
   gt-docker memory sync alpha bravo --type=feedback
   ```

2. **Merge strategies** - Automatic conflict resolution
   ```bash
   gt-docker memory import bravo backup.tar.gz --merge=newest
   ```

3. **Remote sync** - Sync across machines
   ```bash
   gt-docker memory export alpha - | ssh host2 gt-docker memory import bravo -
   ```

4. **Diff command** - Preview differences before sync
   ```bash
   gt-docker memory diff alpha bravo
   ```

5. **Auto-sync on startup** - Optionally sync from backup on instance creation

## Files Modified

- `gt-docker` - Main CLI script with new memory commands
- `README.md` - Documentation for memory sync feature
- `test-memory-sync.sh` - Test script for validation

## Dependencies

- Docker
- bash 4.0+
- Python 3 (for conflict resolution)
- `bd` CLI (in container)
- `gt` CLI (in container)
- tar/gzip

## Known Limitations

1. **No automatic merge** - Conflicts require manual resolution
2. **No incremental sync** - Always exports/imports everything
3. **No versioning** - Overwrites without history
4. **Single-direction** - Sync is one-way (source → dest)
5. **No validation** - Doesn't verify memory format correctness
6. **File permissions** - May not preserve exact permissions on files

These limitations are acceptable for v1 and can be addressed in future iterations if needed.

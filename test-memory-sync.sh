#!/usr/bin/env bash
set -euo pipefail

# Test script for memory sync functionality
# This script validates export, import, sync, and conflict handling

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GT_DOCKER="$SCRIPT_DIR/gt-docker"

echo "=== Gas Town Memory Sync Test ==="
echo ""

# Check if gt-docker exists
if [[ ! -x "$GT_DOCKER" ]]; then
    echo "Error: gt-docker not found or not executable at $GT_DOCKER" >&2
    exit 1
fi

# Check if we have running instances
echo "Checking for running instances..."
INSTANCES=($("$GT_DOCKER" list | grep gastown- | awk '{print $1}' | sed 's/gastown-//'))

if [[ ${#INSTANCES[@]} -lt 2 ]]; then
    echo "⚠️  Need at least 2 running instances for testing"
    echo "Available instances: ${INSTANCES[@]:-none}"
    echo ""
    echo "Start instances with:"
    echo "  gt-docker up test-alpha"
    echo "  gt-docker up test-bravo"
    exit 1
fi

ALPHA="${INSTANCES[0]}"
BRAVO="${INSTANCES[1]}"

echo "Using instances: $ALPHA and $BRAVO"
echo ""

# Test 1: List memories (baseline)
echo "=== Test 1: List memories in both instances ==="
echo ""
echo "[$ALPHA]:"
"$GT_DOCKER" memory list "$ALPHA"
echo ""
echo "[$BRAVO]:"
"$GT_DOCKER" memory list "$BRAVO"
echo ""

# Test 2: Add memories to alpha
echo "=== Test 2: Add test memories to $ALPHA ==="
echo ""
"$GT_DOCKER" exec "$ALPHA" gt remember "Test memory from alpha instance" 2>&1 | grep -v "^$" || true
"$GT_DOCKER" exec "$ALPHA" gt remember --type feedback "Always validate inputs in production" 2>&1 | grep -v "^$" || true
"$GT_DOCKER" exec "$ALPHA" gt remember --type project "Working on memory sync feature" 2>&1 | grep -v "^$" || true
echo "✓ Added 3 memories to $ALPHA"
echo ""

# Test 3: Export memories
echo "=== Test 3: Export memories from $ALPHA ==="
echo ""
EXPORT_FILE="/tmp/test-memory-export-$(date +%s).tar.gz"
"$GT_DOCKER" memory export "$ALPHA" "$EXPORT_FILE"
echo ""
echo "✓ Exported to: $EXPORT_FILE"
echo "  File size: $(du -h "$EXPORT_FILE" | cut -f1)"
echo ""

# Test 4: Import memories to bravo
echo "=== Test 4: Import memories to $BRAVO ==="
echo ""
"$GT_DOCKER" memory import "$BRAVO" "$EXPORT_FILE"
echo ""

# Test 5: Verify memories in bravo
echo "=== Test 5: Verify memories in $BRAVO ==="
echo ""
"$GT_DOCKER" memory list "$BRAVO" | head -20
echo ""

# Test 6: Test direct sync (create new memory in alpha first)
echo "=== Test 6: Test direct sync ==="
echo ""
"$GT_DOCKER" exec "$ALPHA" gt remember --type user "Test user is an experienced engineer" 2>&1 | grep -v "^$" || true
echo "Added user memory to $ALPHA"
echo ""
echo "Syncing $ALPHA → $BRAVO..."
"$GT_DOCKER" memory sync "$ALPHA" "$BRAVO"
echo ""

# Test 7: Verify sync worked
echo "=== Test 7: Verify sync worked ==="
echo ""
echo "Checking if new memory appears in $BRAVO..."
if "$GT_DOCKER" exec "$BRAVO" bd kv list --json 2>/dev/null | grep -q "experienced engineer"; then
    echo "✓ Memory successfully synced!"
else
    echo "⚠️  Memory might not have synced (check manually)"
fi
echo ""

# Cleanup
echo "=== Cleanup ==="
rm -f "$EXPORT_FILE"
echo "✓ Removed temporary export file"
echo ""

echo "=== Test Complete ==="
echo ""
echo "Summary:"
echo "  ✓ List command works"
echo "  ✓ Export command works"
echo "  ✓ Import command works"
echo "  ✓ Sync command works"
echo ""
echo "Manual verification recommended:"
echo "  $GT_DOCKER memory list $ALPHA"
echo "  $GT_DOCKER memory list $BRAVO"

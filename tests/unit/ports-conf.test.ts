/**
 * Tests for ports.conf parsing edge cases.
 * Exercises the get_port function with various fixture files.
 */
import { describe, it, expect } from "vitest";
import { runBashScript, GT_DOCKER, FIXTURES_DIR } from "../helpers/run-command.js";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { join, resolve } from "path";
import { tmpdir } from "os";

async function getPort(instance: string, type: string, portsFile: string) {
  // No set -e: get_port's grep pipeline returns non-zero on no match,
  // which with pipefail would kill the script before the echo "0" fallback.
  const script = `#!/bin/bash
set -uo pipefail
eval "$(sed -n '20,/^# --- main ---/p' '${GT_DOCKER}')"
PORTS_FILE="${portsFile}"
get_port "${instance}" "${type}"
`;
  return runBashScript(script);
}

describe("ports.conf parsing", () => {
  it("parses standard key=value format", async () => {
    const result = await getPort("alpha", "dashboard", resolve(FIXTURES_DIR, "ports.conf"));
    expect(result.stdout).toBe("9001");
  });

  it("handles whitespace around equals sign", async () => {
    const result = await getPort("alpha", "dashboard", resolve(FIXTURES_DIR, "ports-whitespace.conf"));
    expect(result.stdout).toBe("9001");
  });

  it("returns 0 for empty file", async () => {
    const result = await getPort("alpha", "dashboard", resolve(FIXTURES_DIR, "ports-empty.conf"));
    expect(result.stdout).toBe("0");
  });

  it("returns 0 for missing file", async () => {
    const result = await getPort("alpha", "dashboard", "/tmp/nonexistent-ports.conf");
    expect(result.stdout).toBe("0");
  });

  it("ignores comment lines starting with #", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ports-test-"));
    const file = join(dir, "ports.conf");
    await writeFile(file, "# commented.dashboard=9999\nalpha.dashboard=8001\n");
    try {
      const result = await getPort("commented", "dashboard", file);
      expect(result.stdout).toBe("0");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not match partial instance names", async () => {
    const result = await getPort("brav", "dashboard", resolve(FIXTURES_DIR, "ports.conf"));
    expect(result.stdout).toBe("0");
  });

  it("handles multiple entries and returns first match", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ports-test-"));
    const file = join(dir, "ports.conf");
    await writeFile(file, "alpha.dashboard=1111\nalpha.dashboard=2222\n");
    try {
      const result = await getPort("alpha", "dashboard", file);
      expect(result.stdout).toContain("1111");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

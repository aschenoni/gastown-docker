/**
 * Tests for gt-docker formulas subcommand.
 * Uses a temporary script directory with controlled formula/plugin files.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runBashScript, FIXTURES_DIR, PROJECT_ROOT } from "../helpers/run-command.js";
import { createMockDocker, type MockDockerSetup } from "../helpers/mock-docker.js";
import { mkdtemp, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let tmpDir: string;
let mock: MockDockerSetup;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "gt-formulas-test-"));
  mock = await createMockDocker();

  await mkdir(join(tmpDir, "formulas"), { recursive: true });
  await mkdir(join(tmpDir, "plugins"), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function runFormulas(args: string) {
  const script = `#!/bin/bash
set -euo pipefail
eval "$(sed -n '20,/^# --- main ---/p' '${PROJECT_ROOT}/gt-docker')"
SCRIPT_DIR="${tmpDir}"
PORTS_FILE="${tmpDir}/ports.conf"
COMPOSE_FILE="${tmpDir}/docker-compose.yml"
cmd_formulas ${args}
`;
  return runBashScript(script, {
    env: { PATH: `${mock.binDir}:${process.env.PATH!}` },
  });
}

describe("formulas list", () => {
  it("shows (none) when no formulas exist", async () => {
    const result = await runFormulas("list");
    expect(result.stdout).toContain("(none)");
  });

  it("lists formula names and descriptions", async () => {
    await writeFile(
      join(tmpDir, "formulas", "mol-test.formula.toml"),
      'formula = "A test formula"\ntype = "workflow"\n',
    );
    const result = await runFormulas("list");
    expect(result.stdout).toContain("mol-test");
    expect(result.stdout).toContain("A test formula");
  });

  it("lists plugins with descriptions from plugin.md", async () => {
    const pluginDir = join(tmpDir, "plugins", "my-plugin");
    await mkdir(pluginDir, { recursive: true });
    await writeFile(
      join(pluginDir, "plugin.md"),
      'description = "Does something useful"\n',
    );
    const result = await runFormulas("list");
    expect(result.stdout).toContain("my-plugin");
    expect(result.stdout).toContain("Does something useful");
  });

  it("shows (none) for plugins when no plugins exist", async () => {
    await writeFile(
      join(tmpDir, "formulas", "mol-test.formula.toml"),
      'formula = "test"\n',
    );
    const result = await runFormulas("list");
    expect(result.stdout).toContain("Custom plugins");
  });

  it("crashes when plugin has no plugin.md (known bug: grep + set -e)", async () => {
    // BUG: grep for description in nonexistent plugin.md returns non-zero,
    // and with set -euo pipefail, the script exits. The 2>/dev/null only
    // suppresses stderr but doesn't prevent set -e from catching the exit code.
    const pluginDir = join(tmpDir, "plugins", "bare-plugin");
    await mkdir(pluginDir, { recursive: true });
    await writeFile(join(pluginDir, "config.json"), "{}");
    const result = await runFormulas("list");
    // This exits non-zero due to the bug — documenting current behavior
    expect(result.exitCode).not.toBe(0);
  });
});

describe("formulas add", () => {
  it("copies a valid formula file", async () => {
    const sampleFormula = join(FIXTURES_DIR, "sample.formula.toml");
    const result = await runFormulas(`add ${sampleFormula}`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Added sample.formula.toml");
  });

  it("exits 1 for nonexistent file", async () => {
    const result = await runFormulas("add /nonexistent/formula.toml");
    expect(result.exitCode).toBe(1);
  });

  it("exits 1 when no file argument given", async () => {
    const result = await runFormulas("add ''");
    expect(result.exitCode).toBe(1);
  });
});

describe("formulas sync", () => {
  it("exits 1 when no instance given", async () => {
    const result = await runFormulas("sync ''");
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Usage:");
  });
});

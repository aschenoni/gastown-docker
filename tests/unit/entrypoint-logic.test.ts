/**
 * Tests for docker-entrypoint.sh logic.
 * Runs the entrypoint script with mocked binaries to verify conditional behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runBashScript, PROJECT_ROOT } from "../helpers/run-command.js";
import { mkdtemp, writeFile, mkdir, chmod, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let tmpDir: string;
let binDir: string;
let gtDir: string;
let logFile: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "entrypoint-test-"));
  binDir = join(tmpDir, "bin");
  gtDir = join(tmpDir, "gt");
  logFile = join(tmpDir, "calls.log");

  await mkdir(binDir);
  await mkdir(gtDir, { recursive: true });
  await mkdir(join(gtDir, "plugins"), { recursive: true });

  // Create mock binaries that log their calls
  for (const cmd of ["git", "dolt", "ttyd"]) {
    await writeFile(join(binDir, cmd), `#!/bin/sh\necho "${cmd} $*" >> "${logFile}"\n`);
    await chmod(join(binDir, cmd), 0o755);
  }

  // Mock gt binary
  await writeFile(join(binDir, "gt"), `#!/bin/sh\necho "gt $*" >> "${logFile}"\n`);
  await chmod(join(binDir, "gt"), 0o755);

  // Mock cmp — default: files differ (exit 1)
  await writeFile(join(binDir, "cmp"), `#!/bin/sh\necho "cmp $*" >> "${logFile}"\nexit 1\n`);
  await chmod(join(binDir, "cmp"), 0o755);

  await writeFile(logFile, "");
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function runEntrypoint(env: Record<string, string> = {}) {
  const entrypoint = join(PROJECT_ROOT, "docker-entrypoint.sh");

  // Create a modified entrypoint that uses our temp paths
  const script = `#!/bin/sh
set -e
export PATH="${binDir}:$PATH"

# Create modified entrypoint with paths replaced
sed \\
  -e 's|/gt/|${gtDir}/|g' \\
  -e 's|/gt"|${gtDir}"|g' \\
  -e 's|/app/gastown/gt|gt|g' \\
  -e 's|/app/custom-formulas|${tmpDir}/custom-formulas|g' \\
  -e 's|/app/custom-plugins|${tmpDir}/custom-plugins|g' \\
  -e 's|/app/ttyd-mayor.sh|echo ttyd-mock|g' \\
  -e '/^exec "\\$@"/d' \\
  "${entrypoint}" > "${tmpDir}/entrypoint-modified.sh"

chmod +x "${tmpDir}/entrypoint-modified.sh"
sh "${tmpDir}/entrypoint-modified.sh"
`;

  return runBashScript(script, { env });
}

async function getCalls(): Promise<string[]> {
  const content = await readFile(logFile, "utf-8");
  return content.trim().split("\n").filter(Boolean);
}

describe("git/dolt config", () => {
  it("applies git and dolt config when both GIT_USER and GIT_EMAIL are set", async () => {
    await runEntrypoint({ GIT_USER: "TestUser", GIT_EMAIL: "test@test.com" });
    const calls = await getCalls();
    expect(calls.some((c) => c.includes("git config --global user.name TestUser"))).toBe(true);
    expect(calls.some((c) => c.includes("git config --global user.email test@test.com"))).toBe(true);
    expect(calls.some((c) => c.includes("dolt config --global --add user.name TestUser"))).toBe(true);
  });

  it("skips git config when GIT_USER is empty", async () => {
    await runEntrypoint({ GIT_USER: "", GIT_EMAIL: "test@test.com" });
    const calls = await getCalls();
    const gitCalls = calls.filter((c) => c.startsWith("git config"));
    expect(gitCalls).toHaveLength(0);
  });

  it("skips git config when GIT_EMAIL is empty", async () => {
    await runEntrypoint({ GIT_USER: "TestUser", GIT_EMAIL: "" });
    const calls = await getCalls();
    const gitCalls = calls.filter((c) => c.startsWith("git config"));
    expect(gitCalls).toHaveLength(0);
  });

  it("skips git config when neither is set", async () => {
    await runEntrypoint({});
    const calls = await getCalls();
    const gitCalls = calls.filter((c) => c.startsWith("git config"));
    expect(gitCalls).toHaveLength(0);
  });
});

describe("workspace initialization", () => {
  it("runs gt install without --force when town.json is missing", async () => {
    await runEntrypoint({});
    const calls = await getCalls();
    const installCall = calls.find((c) => c.includes("gt install"));
    expect(installCall).toBeDefined();
    expect(installCall).toContain("--git");
    expect(installCall).not.toContain("--force");
  });

  it("runs gt install with --force when town.json exists", async () => {
    await mkdir(join(gtDir, "mayor"), { recursive: true });
    await writeFile(join(gtDir, "mayor", "town.json"), "{}");

    await runEntrypoint({});
    const calls = await getCalls();
    const installCall = calls.find((c) => c.includes("gt install"));
    expect(installCall).toBeDefined();
    expect(installCall).toContain("--force");
  });
});

describe("formula installation", () => {
  it("copies new formulas to the workspace", async () => {
    const customDir = join(tmpDir, "custom-formulas");
    await mkdir(customDir, { recursive: true });
    await writeFile(join(customDir, "test.formula.toml"), 'formula = "test"\n');

    const result = await runEntrypoint({});
    expect(result.stdout).toContain("Installed 1 custom formula(s)");
  });

  it("skips unchanged formulas (cmp returns 0)", async () => {
    // Override cmp mock to return 0 (files identical)
    await writeFile(join(binDir, "cmp"), `#!/bin/sh\necho "cmp $*" >> "${logFile}"\nexit 0\n`);
    await chmod(join(binDir, "cmp"), 0o755);

    const customDir = join(tmpDir, "custom-formulas");
    await mkdir(customDir, { recursive: true });
    await writeFile(join(customDir, "test.formula.toml"), 'formula = "test"\n');

    // Pre-create destination so cmp path exists
    const formulaDir = join(gtDir, ".beads", "formulas");
    await mkdir(formulaDir, { recursive: true });
    await writeFile(join(formulaDir, "test.formula.toml"), 'formula = "test"\n');

    const result = await runEntrypoint({});
    expect(result.stdout).not.toContain("Installed");
  });

  it("silently skips when custom-formulas dir does not exist", async () => {
    const result = await runEntrypoint({});
    expect(result.exitCode).toBe(0);
    // Should not mention formulas at all (the custom dir doesn't exist)
    expect(result.stdout).not.toContain("custom formula");
  });
});

describe("plugin installation", () => {
  it("copies new plugin files to the workspace", async () => {
    const pluginSrc = join(tmpDir, "custom-plugins", "test-plugin");
    await mkdir(pluginSrc, { recursive: true });
    await writeFile(join(pluginSrc, "plugin.md"), 'description = "test"\n');

    const result = await runEntrypoint({});
    expect(result.stdout).toContain("Installed/updated 1 custom plugin file(s)");
  });
});

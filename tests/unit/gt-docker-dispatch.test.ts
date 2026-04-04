/**
 * Tests for gt-docker argument parsing, dispatch, and aliases.
 * Uses a mock docker binary so no real Docker is needed.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { gtDocker } from "../helpers/run-command.js";
import { createMockDocker, type MockDockerSetup } from "../helpers/mock-docker.js";

let mock: MockDockerSetup;

beforeEach(async () => {
  // Fresh mock for each test so call logs don't bleed
  mock = await createMockDocker();
});

describe("gt-docker argument validation", () => {
  it("exits 1 with usage when called with no args", async () => {
    const result = await gtDocker("", { mockDockerDir: mock.binDir });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("gt-docker");
    expect(result.stdout).toContain("Usage:");
  });

  it("exits 1 for unknown command", async () => {
    const result = await gtDocker("bogus", { mockDockerDir: mock.binDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command: bogus");
  });

  it.each(["help", "--help", "-h"])("exits 1 with usage for %s", async (flag) => {
    const result = await gtDocker(flag, { mockDockerDir: mock.binDir });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Usage:");
  });

  it.each([
    ["up", "Usage: gt-docker up"],
    ["down", "Usage: gt-docker down"],
    ["destroy", "Usage: gt-docker destroy"],
    ["mayor", "Usage: gt-docker mayor"],
    ["shell", "Usage: gt-docker shell"],
    ["exec", "Usage: gt-docker exec"],
    ["logs", "Usage: gt-docker logs"],
  ])("%s without instance exits 1", async (cmd, expectedMsg) => {
    const result = await gtDocker(cmd, { mockDockerDir: mock.binDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(expectedMsg);
  });
});

describe("gt-docker command aliases", () => {
  // Alias tests verify the dispatch works by checking stdout messages
  // rather than mock docker calls, since the real script prepends Docker
  // Desktop's PATH internally which can bypass our mock.

  it("start is an alias for up (calls docker compose up)", async () => {
    const result = await gtDocker("start test-inst", { mockDockerDir: mock.binDir });
    // cmd_up prints "Starting gastown instance..." regardless of docker result
    expect(result.stdout).toContain("Starting gastown instance");
  });

  it("stop is an alias for down", async () => {
    const result = await gtDocker("stop test-inst", { mockDockerDir: mock.binDir });
    expect(result.stdout).toContain("Stopping instance");
  });

  it("rm is an alias for destroy", async () => {
    const result = await gtDocker("rm test-inst", { mockDockerDir: mock.binDir });
    expect(result.stdout).toContain("Destroying instance");
    expect(result.stdout).toContain("including volumes");
  });

  it.each(["ls", "ps"])("%s is an alias for list", async (alias) => {
    const result = await gtDocker(alias, { mockDockerDir: mock.binDir });
    expect(result.stdout).toContain("Running gastown instances:");
  });
});

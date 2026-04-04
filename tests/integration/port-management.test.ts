/**
 * Integration tests for port management.
 * Verifies static port assignment and auto-assignment behavior.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { run, gtDocker } from "../helpers/run-command.js";

const INSTANCE = "vitest-ports";
const CONTAINER = `gastown-${INSTANCE}`;

// Use explicit ports so we can verify them
const DASHBOARD_PORT = "19080";
const TERMINAL_PORT = "19081";

beforeAll(async () => {
  const result = await gtDocker(`up ${INSTANCE}`, {
    env: {
      DASHBOARD_PORT,
      TERMINAL_PORT,
    },
  });
  expect(result.exitCode).toBe(0);

  // Wait for container to be running (don't need full init for port tests)
  let running = false;
  for (let i = 0; i < 30; i++) {
    const inspect = await run(
      `docker inspect --format='{{.State.Running}}' ${CONTAINER}`,
    );
    if (inspect.stdout.trim() === "true") {
      running = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  expect(running).toBe(true);
}, 600_000);

afterAll(async () => {
  await gtDocker(`destroy ${INSTANCE}`);
}, 60_000);

describe("static port assignment", () => {
  it("dashboard port is mapped correctly", async () => {
    const result = await run(
      `docker port ${CONTAINER} 8080`,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(DASHBOARD_PORT);
  });

  it("terminal port is mapped correctly", async () => {
    const result = await run(
      `docker port ${CONTAINER} 7681`,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(TERMINAL_PORT);
  });
});

describe("auto-assigned ports", () => {
  const AUTO_INSTANCE = "vitest-autoport";
  const AUTO_CONTAINER = `gastown-${AUTO_INSTANCE}`;

  afterAll(async () => {
    await gtDocker(`destroy ${AUTO_INSTANCE}`);
  }, 60_000);

  it("auto-assigns non-zero ports when port is 0", async () => {
    const result = await gtDocker(`up ${AUTO_INSTANCE}`, {
      env: { DASHBOARD_PORT: "0", TERMINAL_PORT: "0" },
    });
    expect(result.exitCode).toBe(0);

    // Check that ports were assigned
    const ports = await run(`docker port ${AUTO_CONTAINER}`);
    expect(ports.exitCode).toBe(0);
    // Should have mappings for both 8080 and 7681
    expect(ports.stdout).toContain("8080");
    expect(ports.stdout).toContain("7681");
  }, 600_000);
});

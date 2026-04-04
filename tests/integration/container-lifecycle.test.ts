/**
 * Integration tests for container lifecycle via gt-docker.
 * Starts a real container, verifies behavior, then cleans up.
 *
 * These tests require Docker to be available and may take several minutes.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { run, gtDocker, PROJECT_ROOT } from "../helpers/run-command.js";

const INSTANCE = "vitest-lifecycle";
const CONTAINER = `gastown-${INSTANCE}`;

beforeAll(async () => {
  // Build and start the instance
  const result = await gtDocker(`up ${INSTANCE}`, {
    env: {
      DASHBOARD_PORT: "0",
      TERMINAL_PORT: "0",
    },
  });
  expect(result.exitCode).toBe(0);

  // Wait for entrypoint to complete initialization
  // Poll for the "All services started" log message
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const logs = await run(`docker logs ${CONTAINER} 2>&1`);
    if (logs.stdout.includes("All services started")) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!ready) {
    const logs = await run(`docker logs ${CONTAINER} 2>&1`);
    console.error("Container logs:\n", logs.stdout);
  }
  expect(ready).toBe(true);
}, 600_000); // 10 minute timeout

afterAll(async () => {
  await gtDocker(`destroy ${INSTANCE}`);
}, 60_000);

describe("container state", () => {
  it("container is running", async () => {
    const result = await run(
      `docker inspect --format='{{.State.Running}}' ${CONTAINER}`,
    );
    expect(result.stdout.trim()).toBe("true");
  });

  it("container has correct name", async () => {
    const result = await run(
      `docker inspect --format='{{.Name}}' ${CONTAINER}`,
    );
    expect(result.stdout.trim()).toBe(`/${CONTAINER}`);
  });
});

describe("exec as agent user", () => {
  it("whoami returns agent", async () => {
    const result = await gtDocker(`exec ${INSTANCE} whoami`);
    expect(result.stdout.trim()).toBe("agent");
  });

  it("UID is 1000", async () => {
    const result = await gtDocker(`exec ${INSTANCE} id -u`);
    expect(result.stdout.trim()).toBe("1000");
  });
});

describe("workspace", () => {
  it("/gt directory exists", async () => {
    const result = await gtDocker(`exec ${INSTANCE} test -d /gt`);
    expect(result.exitCode).toBe(0);
  });

  it("town.json was created by gt install", async () => {
    const result = await gtDocker(
      `exec ${INSTANCE} test -f /gt/mayor/town.json`,
    );
    expect(result.exitCode).toBe(0);
  });
});

describe("gt-docker list", () => {
  it("includes the test instance", async () => {
    const result = await gtDocker("list");
    expect(result.stdout).toContain(CONTAINER);
  });
});

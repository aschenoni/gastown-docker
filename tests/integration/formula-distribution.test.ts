/**
 * Integration tests for formula and plugin distribution inside a running container.
 * Reuses the container from container-lifecycle tests (or starts its own).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { run, gtDocker, PROJECT_ROOT } from "../helpers/run-command.js";
import { readdir } from "fs/promises";
import { join } from "path";

const INSTANCE = "vitest-formulas";
const CONTAINER = `gastown-${INSTANCE}`;

beforeAll(async () => {
  const result = await gtDocker(`up ${INSTANCE}`, {
    env: { DASHBOARD_PORT: "0", TERMINAL_PORT: "0" },
  });
  expect(result.exitCode).toBe(0);

  // Wait for initialization
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const logs = await run(`docker logs ${CONTAINER} 2>&1`);
    if (logs.stdout.includes("All services started")) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  expect(ready).toBe(true);
}, 600_000);

afterAll(async () => {
  await gtDocker(`destroy ${INSTANCE}`);
}, 60_000);

describe("formula distribution", () => {
  it("all formulas are installed to /gt/.beads/formulas/", async () => {
    // Count source formulas
    const sourceFormulas = await readdir(join(PROJECT_ROOT, "formulas"));
    const formulaCount = sourceFormulas.filter((f) =>
      f.endsWith(".formula.toml"),
    ).length;

    // Count installed formulas in container
    const result = await run(
      `docker exec ${CONTAINER} sh -c "ls /gt/.beads/formulas/*.formula.toml 2>/dev/null | wc -l"`,
    );
    const installedCount = parseInt(result.stdout.trim());
    expect(installedCount).toBeGreaterThanOrEqual(formulaCount);
  });

  it("formula content matches source", async () => {
    // Spot-check one formula
    const result = await run(
      `docker exec ${CONTAINER} cat /gt/.beads/formulas/mol-brainstorm.formula.toml`,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("brainstorm");
  });
});

describe("plugin distribution", () => {
  it("brainstorm-review plugin is installed", async () => {
    const result = await run(
      `docker exec ${CONTAINER} test -d /gt/plugins/brainstorm-review`,
    );
    expect(result.exitCode).toBe(0);
  });

  it("pulse-refresh plugin is installed", async () => {
    const result = await run(
      `docker exec ${CONTAINER} test -d /gt/plugins/pulse-refresh`,
    );
    expect(result.exitCode).toBe(0);
  });

  it("plugin.md files are present", async () => {
    const result = await run(
      `docker exec ${CONTAINER} sh -c "cat /gt/plugins/brainstorm-review/plugin.md"`,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("brainstorm");
  });
});

describe("formula sync (live)", () => {
  it("gt-docker formulas sync pushes to running instance", async () => {
    const result = await gtDocker(`formulas sync ${INSTANCE}`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Done");
  });
});

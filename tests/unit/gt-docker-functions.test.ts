/**
 * Tests for gt-docker pure functions: get_port, container_name, compose_env.
 * Runs bash scripts via temp files to avoid shell quoting issues.
 */
import { describe, it, expect } from "vitest";
import { runBashScript, GT_DOCKER, FIXTURES_DIR } from "../helpers/run-command.js";
import { resolve } from "path";

/**
 * Run a bash snippet that sources gt-docker functions (up to the main marker)
 * with PORTS_FILE overridden to a fixture, then executes the snippet.
 */
async function runFunction(
  snippet: string,
  portsFile = resolve(FIXTURES_DIR, "ports.conf"),
) {
  // Use set -uo pipefail (no -e) because get_port's grep pipeline returns
  // non-zero when there's no match, and set -e would kill the script before
  // reaching the echo "0" fallback. In real gt-docker, get_port is called
  // inside ${VAR:-$(get_port ...)} which exempts it from set -e.
  const script = `#!/bin/bash
set -uo pipefail
eval "$(sed -n '20,/^# --- main ---/p' '${GT_DOCKER}')"
PORTS_FILE="${portsFile}"
${snippet}
`;
  return runBashScript(script);
}

describe("get_port", () => {
  it("returns dashboard port for known instance", async () => {
    const result = await runFunction("get_port alpha dashboard");
    expect(result.stdout).toBe("9001");
  });

  it("returns terminal port for known instance", async () => {
    const result = await runFunction("get_port alpha terminal");
    expect(result.stdout).toBe("9002");
  });

  it("defaults to dashboard when type is omitted", async () => {
    const result = await runFunction("get_port alpha");
    expect(result.stdout).toBe("9001");
  });

  it("returns 0 for unknown instance", async () => {
    const result = await runFunction("get_port unknown dashboard");
    expect(result.stdout).toBe("0");
  });

  it("returns 0 when ports file is missing", async () => {
    const result = await runFunction(
      "get_port alpha dashboard",
      "/nonexistent/ports.conf",
    );
    expect(result.stdout).toBe("0");
  });

  it("returns 0 for empty ports file", async () => {
    const result = await runFunction(
      "get_port alpha dashboard",
      resolve(FIXTURES_DIR, "ports-empty.conf"),
    );
    expect(result.stdout).toBe("0");
  });

  it("trims whitespace around port values", async () => {
    const result = await runFunction(
      "get_port alpha dashboard",
      resolve(FIXTURES_DIR, "ports-whitespace.conf"),
    );
    expect(result.stdout).toBe("9001");
  });

  it("does not false-match substring instance names", async () => {
    const result = await runFunction("get_port alph dashboard");
    expect(result.stdout).toBe("0");
  });
});

describe("container_name", () => {
  it("prefixes with gastown-", async () => {
    const result = await runFunction("container_name alpha");
    expect(result.stdout).toBe("gastown-alpha");
  });

  it("handles hyphenated names", async () => {
    const result = await runFunction("container_name my-instance");
    expect(result.stdout).toBe("gastown-my-instance");
  });
});

describe("compose_env", () => {
  it("exports GT_INSTANCE", async () => {
    const result = await runFunction(
      'compose_env testinst && echo "$GT_INSTANCE"',
    );
    expect(result.stdout).toBe("testinst");
  });

  it("exports COMPOSE_PROJECT_NAME with gt- prefix", async () => {
    const result = await runFunction(
      'compose_env testinst && echo "$COMPOSE_PROJECT_NAME"',
    );
    expect(result.stdout).toBe("gt-testinst");
  });
});

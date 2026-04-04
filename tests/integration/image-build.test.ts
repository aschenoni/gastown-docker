/**
 * Integration tests for the Docker image build.
 * Verifies all required binaries, ownership, environment, and config.
 *
 * These tests build the image once and run `docker run --rm` commands
 * against it. They require Docker to be available.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { run, PROJECT_ROOT } from "../helpers/run-command.js";

const IMAGE_NAME = "gastown-test-image";

beforeAll(async () => {
  // Build the image (may take a few minutes on first run)
  const result = await run(`docker build -t ${IMAGE_NAME} ${PROJECT_ROOT}`);
  expect(result.exitCode).toBe(0);
}, 600_000); // 10 minute timeout for build

/**
 * Run a command inside the test image and return the result.
 * Uses --user agent to match runtime behavior.
 */
async function dockerRun(command: string, user = "agent") {
  return run(
    `docker run --rm --user ${user} ${IMAGE_NAME} sh -c ${JSON.stringify(command)}`,
  );
}

describe("required binaries", () => {
  it.each([
    "git",
    "tmux",
    "curl",
    "rg",
    "zsh",
    "gh",
    "nc",
    "ssh",
    "tini",
    "ttyd",
    "vim",
    "aws",
    "go",
    "dolt",
    "sqlite3",
  ])("%s is installed and executable", async (binary) => {
    const result = await dockerRun(`which ${binary}`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBeTruthy();
  });

  it("gt (gastown) binary is available", async () => {
    const result = await dockerRun("which gt");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("/app/gastown/gt");
  });

  it("bd (beads) binary is available", async () => {
    // bd may be installed to different locations
    const result = await dockerRun("which bd || which beads");
    expect(result.exitCode).toBe(0);
  });
});

describe("directory ownership", () => {
  it("/app is owned by agent (UID 1000)", async () => {
    const result = await dockerRun("stat -c %u /app", "root");
    expect(result.stdout.trim()).toBe("1000");
  });

  it("/gt is owned by agent (UID 1000)", async () => {
    const result = await dockerRun("stat -c %u /gt", "root");
    expect(result.stdout.trim()).toBe("1000");
  });
});

describe("environment variables", () => {
  it("PATH includes /app/gastown", async () => {
    const result = await dockerRun("echo $PATH");
    expect(result.stdout).toContain("/app/gastown");
  });

  it("PATH includes /home/agent/.local/bin", async () => {
    const result = await dockerRun("echo $PATH");
    expect(result.stdout).toContain("/home/agent/.local/bin");
  });

  it("COLORTERM is set to truecolor", async () => {
    // Need login shell to pick up /etc/profile.d/
    const result = await dockerRun("bash -l -c 'echo $COLORTERM'");
    expect(result.stdout.trim()).toBe("truecolor");
  });

  it("TERM is set to xterm-256color", async () => {
    const result = await dockerRun("bash -l -c 'echo $TERM'");
    expect(result.stdout.trim()).toBe("xterm-256color");
  });
});

describe("tmux configuration", () => {
  it("agent tmux.conf has mouse enabled", async () => {
    const result = await dockerRun("grep 'mouse on' /home/agent/.tmux.conf");
    expect(result.exitCode).toBe(0);
  });

  it("agent tmux.conf has large history limit", async () => {
    const result = await dockerRun(
      "grep 'history-limit 50000' /home/agent/.tmux.conf",
    );
    expect(result.exitCode).toBe(0);
  });

  it("agent tmux.conf has F12 mouse toggle", async () => {
    const result = await dockerRun("grep 'F12' /home/agent/.tmux.conf");
    expect(result.exitCode).toBe(0);
  });
});

describe("custom formulas and plugins", () => {
  it("/app/custom-formulas/ directory exists", async () => {
    const result = await dockerRun("test -d /app/custom-formulas && echo yes");
    expect(result.stdout.trim()).toBe("yes");
  });

  it("/app/custom-plugins/ directory exists", async () => {
    const result = await dockerRun("test -d /app/custom-plugins && echo yes");
    expect(result.stdout.trim()).toBe("yes");
  });

  it("formula files are baked into the image", async () => {
    const result = await dockerRun(
      "ls /app/custom-formulas/*.formula.toml | wc -l",
    );
    const count = parseInt(result.stdout.trim());
    expect(count).toBeGreaterThanOrEqual(7);
  });

  it("plugin directories are baked into the image", async () => {
    const result = await dockerRun(
      "ls -d /app/custom-plugins/*/ 2>/dev/null | wc -l",
    );
    const count = parseInt(result.stdout.trim());
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

describe("entrypoint scripts", () => {
  it("docker-entrypoint.sh is executable", async () => {
    const result = await dockerRun("test -x /app/docker-entrypoint.sh && echo yes");
    expect(result.stdout.trim()).toBe("yes");
  });

  it("docker-entrypoint-wrapper.sh is executable", async () => {
    const result = await dockerRun(
      "test -x /app/docker-entrypoint-wrapper.sh && echo yes",
      "root",
    );
    expect(result.stdout.trim()).toBe("yes");
  });

  it("ttyd-mayor.sh is executable", async () => {
    const result = await dockerRun("test -x /app/ttyd-mayor.sh && echo yes");
    expect(result.stdout.trim()).toBe("yes");
  });
});

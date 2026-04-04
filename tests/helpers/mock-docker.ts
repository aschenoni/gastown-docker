/**
 * Creates a temporary directory with a mock `docker` binary that logs
 * all calls to a file and returns configurable output.
 */
import { mkdtemp, writeFile, chmod, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export interface MockDockerSetup {
  /** Directory containing the mock `docker` binary — prepend to PATH */
  binDir: string;
  /** Path to the log file where docker calls are recorded */
  logFile: string;
  /** Read all logged docker calls */
  getCalls: () => Promise<string[]>;
}

/**
 * Create a mock docker binary in a temp directory.
 * The mock logs every invocation to a file and exits 0.
 *
 * @param exitCode - Exit code the mock should return (default: 0)
 * @param stdout - Output the mock should print (default: "")
 */
export async function createMockDocker(
  exitCode = 0,
  stdout = "",
): Promise<MockDockerSetup> {
  const binDir = await mkdtemp(join(tmpdir(), "mock-docker-"));
  const logFile = join(binDir, "docker-calls.log");

  // Also create a mock `docker` that handles `compose` subcommands
  const mockScript = `#!/bin/sh
echo "$@" >> "${logFile}"
${stdout ? `echo "${stdout.replace(/"/g, '\\"')}"` : ""}
exit ${exitCode}
`;

  await writeFile(join(binDir, "docker"), mockScript);
  await chmod(join(binDir, "docker"), 0o755);

  // Initialize empty log
  await writeFile(logFile, "");

  return {
    binDir,
    logFile,
    getCalls: async () => {
      const content = await readFile(logFile, "utf-8");
      return content.trim().split("\n").filter(Boolean);
    },
  };
}

/**
 * Create a temporary script directory that mirrors gt-docker's expected
 * layout but with test fixtures, so we can test formulas list/add etc.
 */
export async function createMockScriptDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "gt-docker-test-"));
  await mkdir(join(dir, "formulas"), { recursive: true });
  await mkdir(join(dir, "plugins"), { recursive: true });
  return dir;
}

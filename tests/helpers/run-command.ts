/**
 * Helper to run gt-docker and other shell commands in tests.
 * Wraps execa with sensible defaults for testing CLI scripts.
 */
import { execa, execaCommand } from "execa";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFile, chmod, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, "../..");
export const GT_DOCKER = resolve(PROJECT_ROOT, "gt-docker");
export const FIXTURES_DIR = resolve(__dirname, "../fixtures");

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a command and return stdout, stderr, and exit code.
 * Never throws — captures failures as non-zero exit codes.
 */
export async function run(
  command: string,
  options: { env?: Record<string, string>; cwd?: string } = {},
): Promise<RunResult> {
  try {
    const result = await execaCommand(command, {
      cwd: options.cwd ?? PROJECT_ROOT,
      env: { ...process.env, ...options.env },
      reject: false,
      shell: true,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? error.message,
      exitCode: error.exitCode ?? 1,
    };
  }
}

/**
 * Run a bash script from a temp file to avoid quoting issues.
 * Use this when the script contains complex quoting/interpolation.
 */
export async function runBashScript(
  script: string,
  options: { env?: Record<string, string> } = {},
): Promise<RunResult> {
  const dir = await mkdtemp(join(tmpdir(), "gt-test-"));
  const scriptPath = join(dir, "test-script.sh");
  await writeFile(scriptPath, script);
  await chmod(scriptPath, 0o755);
  try {
    const result = await execa("bash", [scriptPath], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...options.env },
      reject: false,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? error.message,
      exitCode: error.exitCode ?? 1,
    };
  }
}

/**
 * Run gt-docker with given arguments.
 * Prepends a mock docker binary to PATH if mockDockerDir is provided.
 */
export async function gtDocker(
  args: string,
  options: {
    env?: Record<string, string>;
    mockDockerDir?: string;
  } = {},
): Promise<RunResult> {
  const env: Record<string, string> = { ...options.env };
  if (options.mockDockerDir) {
    env.PATH = `${options.mockDockerDir}:${process.env.PATH}`;
  }
  return run(`${GT_DOCKER} ${args}`, { env });
}

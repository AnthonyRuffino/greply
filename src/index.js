import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import readline from "node:readline";

const execFileAsync = promisify(execFile);

// Prefer bundled greply.sh if present in the package tarball, else fall back to env or PATH
function resolveDefaultGreplCmd() {
  const envOverride = process.env.greply_CMD;
  if (envOverride && envOverride.trim()) return envOverride;
  
  const candidateInPkg = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "greply.sh");
  try {
    // On some systems URL pathname is percent-encoded; decode it
    const decoded = decodeURIComponent(candidateInPkg);
    if (fs.existsSync(decoded)) {
      return decoded;
    }
  } catch {}
  return "greply";
}

const DEFAULT_greply_CMD = resolveDefaultGreplCmd();

/**
 * Build CLI args for greply from options.
 * Mirrors: -B (before), -A (after), -R, -w, -c, -F
 */
function buildArgs(opts) {
  const {
    query,
    target = ".",
    before,
    after,
    recursive,
    wholeWord,
    matchCase,
    fixedStrings,
    noColor
  } = opts;

  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("query is required and must be a non-empty string");
  }

  const cliArgs = [];
  if (Number.isInteger(before) && before >= 0) cliArgs.push("-B", String(before));
  if (Number.isInteger(after)  && after  >= 0) cliArgs.push("-A", String(after));
  if (recursive)    cliArgs.push("-R");
  if (wholeWord)    cliArgs.push("-w");
  if (matchCase)    cliArgs.push("-c");
  if (fixedStrings) cliArgs.push("-F");
  if (noColor)      cliArgs.push("--no-color");

  // Important: execFile separates args safely (no shell interpolation).
  cliArgs.push(query, path.resolve(process.cwd(), target));
  return cliArgs;
}

/**
 * Run greply and get stdout/stderr. Throws on non-zero exit unless `suppressErrors` is true.
 *
 * @param {Object} opts
 * @param {string} [opts.greplyCmd] path or command name for greply
 * @param {string} opts.query       search string
 * @param {string} [opts.target="."] file or directory path
 * @param {number} [opts.before]    -B
 * @param {number} [opts.after]     -A
 * @param {boolean} [opts.recursive] -R
 * @param {boolean} [opts.wholeWord] -w
 * @param {boolean} [opts.matchCase] -c
 * @param {boolean} [opts.fixedStrings] -F
 * @param {boolean} [opts.noColor]   --no-color
 * @param {boolean} [opts.suppressErrors=false] if true, return stdout/stderr even on failure
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export async function greplyRun(opts) {
  const greplyCmd = opts?.greplyCmd || DEFAULT_greply_CMD;
  const args = buildArgs(opts);

  try {
    const { stdout, stderr } = await execFileAsync(greplyCmd, args, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024
    });
    return { stdout: stdout ?? "", stderr: stderr ?? "" };
  } catch (err) {
    // Handle "no matches found" case (exit code 1) as normal, not an error
    if (err?.code === 1 && (!err.stdout || err.stdout === '') && (!err.stderr || err.stderr === '')) {
      return { stdout: "", stderr: "", code: 1 };
    }
    
    if (opts?.suppressErrors) {
      const stdout = err?.stdout ?? "";
      const stderr = (err?.stderr ?? "") || String(err?.message ?? err);
      return { stdout, stderr };
    }
    // Re-throw with both streams included for easier debugging upstream
    const enriched = new Error(
      [
        `greply failed: ${err?.message ?? err}`,
        err?.stdout ? `\nSTDOUT:\n${err.stdout}` : "",
        err?.stderr ? `\nSTDERR:\n${err.stderr}` : ""
      ].join("")
    );
    enriched.code = err?.code;
    enriched.stdout = err?.stdout;
    enriched.stderr = err?.stderr;
    throw enriched;
  }
}

/**
 * Call greply with no args to print usage/help.
 * @param {Object} [opts]
 * @param {string} [opts.greplyCmd]
 */
export async function greplyHelp(opts = {}) {
  const greplyCmd = opts.greplyCmd || DEFAULT_greply_CMD;
  try {
    const { stdout, stderr } = await execFileAsync(greplyCmd, [], {
      cwd: process.cwd(),
      maxBuffer: 2 * 1024 * 1024
    });
    return { stdout: stdout ?? "", stderr: stderr ?? "" };
  } catch (err) {
    // many CLIs return non-zero on --help/usage; surface whatever came out
    return {
      stdout: err?.stdout ?? "",
      stderr: (err?.stderr ?? "") || String(err?.message ?? err)
    };
  }
}

export { buildArgs };

// -----------------------------
// Installer for greply CLI (bundled copy only)
// -----------------------------

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.FOK ?? fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function promptYesNo(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} `, (answer) => {
      rl.close();
      const normalized = String(answer || "").trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

/**
 * Install the bundled greply CLI script locally.
 * - Copies this package's bundled greply.sh
 * - Writes to destDir/fileName (default $HOME/.local/bin/greply)
 * - chmod +x on the installed file
 *
 * @param {Object} [opts]
 * @param {string} [opts.destDir] Destination directory (default $HOME/.local/bin)
 * @param {string} [opts.fileName="greply"] Installed filename
 * @returns {Promise<{ installed: boolean, path: string, skipped?: boolean, reason?: string }>} Install result
 */
export async function install(opts = {}) {
  const defaultUserBin = path.join(os.homedir(), ".local", "bin");
  const destDir = opts.destDir || defaultUserBin;
  const fileName = opts.fileName || "greply";

  const destinationPath = path.resolve(destDir, fileName);
  const bundledCandidate = decodeURIComponent(path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "greply.sh"));

  if (!(await fileExists(bundledCandidate))) {
    const err = new Error("Bundled greply.sh not found in this package. Cannot install.");
    err.code = "ENOENT";
    throw err;
  }

  try {
    await fs.promises.mkdir(destDir, { recursive: true });
  } catch (err) {
    // proceed; write will surface a clearer error
  }

  if (await fileExists(destinationPath)) {
    const error = new Error(`Destination exists: ${destinationPath}.`);
      error.code = "EEXIST";
      throw error;
  }

  try {
    await fs.promises.copyFile(bundledCandidate, destinationPath);
    await fs.promises.chmod(destinationPath, 0o755);
  } catch (err) {
    if (err && (err.code === "EACCES" || err.code === "EPERM")) {
      const guidance = [
        `Permission denied writing to ${destDir}.`,
        `Try one of the following:`,
        `- Use a user-writable directory (default): ${defaultUserBin} and ensure it's on PATH`,
        `- Or re-run with elevated permissions for system dirs (e.g. /usr/local/bin)`
      ].join("\n");
      const wrapped = new Error(guidance);
      wrapped.code = err.code;
      wrapped.cause = err;
      throw wrapped;
    }
    throw err;
  }

  console.log(`✅ greply installed successfully to: ${destinationPath}`);
  return { installed: true, path: destinationPath };
}



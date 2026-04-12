#!/usr/bin/env node
//
// token-usage.js — Read Claude Code transcripts and output raw token counts.
//
// This replicates the transcript-reading logic from `gt costs` but outputs
// token counts instead of USD, which is more meaningful for flat-rate
// Claude subscriptions where usage is throttled by tokens, not dollars.
//
// Usage: node token-usage.js [--by-role]
//
// Output JSON:
//   {
//     "sessions": [...],
//     "total": { input_tokens, output_tokens, cache_read_tokens, cache_create_tokens, total_tokens },
//     "by_role": { "mayor": { ... }, "polecat": { ... } }
//   }

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const readline = require("readline");

const SESSION_PREFIX = "gt-";
const CLAUDE_CONFIG_DIR =
  process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || "/home/agent", ".claude");

// Roles derived from session name patterns (matches gastown session naming)
const ROLE_PATTERNS = [
  { pattern: /^gt-[^-]+-mayor$/, role: "mayor" },
  { pattern: /^gt-[^-]+-deacon$/, role: "deacon" },
  { pattern: /^gt-[^-]+-witness-/, role: "witness" },
  { pattern: /^gt-[^-]+-refinery-/, role: "refinery" },
  { pattern: /^gt-[^-]+-polecat-/, role: "polecat" },
  { pattern: /^gt-[^-]+-crew-/, role: "crew" },
  { pattern: /^gt-[^-]+-boot/, role: "boot" },
  { pattern: /^gt-[^-]+-dog-/, role: "dog" },
];

function getRole(sessionName) {
  for (const { pattern, role } of ROLE_PATTERNS) {
    if (pattern.test(sessionName)) return role;
  }
  return "unknown";
}

function emptyTokens() {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_create_tokens: 0,
    total_tokens: 0,
  };
}

function addTokens(a, b) {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_tokens: a.cache_read_tokens + b.cache_read_tokens,
    cache_create_tokens: a.cache_create_tokens + b.cache_create_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
  };
}

// Convert a working directory path to Claude's project directory name.
// Claude Code encodes path separators and underscores as hyphens.
function toClaudeProjectName(workDir) {
  return workDir.replace(/[/_]/g, "-");
}

function findLatestTranscript(projectDir) {
  if (!fs.existsSync(projectDir)) return null;

  let latestPath = null;
  let latestTime = 0;

  for (const entry of fs.readdirSync(projectDir)) {
    if (!entry.endsWith(".jsonl")) continue;
    const fullPath = path.join(projectDir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs > latestTime) {
      latestTime = stat.mtimeMs;
      latestPath = fullPath;
    }
  }

  return latestPath;
}

async function parseTranscriptTokens(transcriptPath) {
  const tokens = emptyTokens();

  const stream = fs.createReadStream(transcriptPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;

    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }

    if (msg.type !== "assistant" || !msg.message?.usage) continue;

    const u = msg.message.usage;
    tokens.input_tokens += u.input_tokens || 0;
    tokens.output_tokens += u.output_tokens || 0;
    tokens.cache_read_tokens += u.cache_read_input_tokens || 0;
    tokens.cache_create_tokens += u.cache_creation_input_tokens || 0;
  }

  tokens.total_tokens =
    tokens.input_tokens +
    tokens.output_tokens +
    tokens.cache_read_tokens +
    tokens.cache_create_tokens;

  return tokens;
}

function getTmuxSessions() {
  try {
    const out = execFileSync("tmux", ["list-sessions", "-F", "#{session_name}"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return out
      .trim()
      .split("\n")
      .filter((s) => s.startsWith(SESSION_PREFIX));
  } catch {
    return [];
  }
}

function getTmuxSessionWorkDir(session) {
  try {
    const out = execFileSync(
      "tmux",
      ["display-message", "-t", session, "-p", "#{pane_current_path}"],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return out.trim() || null;
  } catch {
    return null;
  }
}

async function main() {
  const byRole = process.argv.includes("--by-role");

  const sessions = getTmuxSessions();
  const results = [];
  const roleTokens = {};
  let totalTokens = emptyTokens();

  for (const sess of sessions) {
    const workDir = getTmuxSessionWorkDir(sess);
    if (!workDir) continue;

    const projectName = toClaudeProjectName(workDir);
    const projectDir = path.join(CLAUDE_CONFIG_DIR, "projects", projectName);
    const transcript = findLatestTranscript(projectDir);
    if (!transcript) continue;

    const tokens = await parseTranscriptTokens(transcript);
    const role = getRole(sess);

    results.push({
      session: sess,
      role,
      ...tokens,
    });

    totalTokens = addTokens(totalTokens, tokens);

    if (byRole) {
      if (!roleTokens[role]) roleTokens[role] = emptyTokens();
      roleTokens[role] = addTokens(roleTokens[role], tokens);
    }
  }

  const output = {
    sessions: results,
    total: totalTokens,
  };

  if (byRole) {
    output.by_role = roleTokens;
  }

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(`token-usage error: ${err.message}\n`);
  process.exit(1);
});

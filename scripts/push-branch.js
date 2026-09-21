#!/usr/bin/env node

const { execSync, spawnSync } = require("child_process");

const REQUIRED_ARGS = ["branch", "message", "files"];

const parseArgs = () => {
  const opts = {};

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "");
    const value = args[i + 1];

    if (key && value) {


      if (key === "files") {
        opts.files = (value || "")
          .split(/[,\n]/)
          .map((part) => part.trim())
          .filter(Boolean);
      } else {
        opts[key] = value;
      }
    }
  }

  const missing = REQUIRED_ARGS.filter((key) => opts[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Missing required argument(s): ${missing.map((key) => `--${key}`).join(", ")}`);
  }

  return opts;
};

const runCommand = (command, options = {}) => {
  execSync(command, { stdio: "inherit", ...options });
};

const getRepoRoot = () =>
  execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();

const remoteExists = (branch) => {
  const { status } = spawnSync("git", ["ls-remote", "--exit-code", "--heads", "origin", branch]);
  return status === 0;
};

const shouldCommit = () => {
  const { status } = spawnSync("git", ["diff", "--cached", "--quiet", "--exit-code"]);
  return status !== 0;
};

const runPush = () => {
  const opts = parseArgs();
  const repoRoot = getRepoRoot();
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GIT_TOKEN;

  // You can pass in a GIT_REMOTE_URL that points at an empty repo for testing purposes
  const remoteUrl = process.env.GIT_REMOTE_URL ||
    (repo && token ? `https://x-access-token:${token}@github.com/${repo}` : null);

  if (!remoteUrl) {
    throw new Error(
      "Missing git remote URL. Set GIT_REMOTE_URL or provide GITHUB_REPOSITORY and GITHUB_TOKEN.",
    );
  }

  const branch = opts.branch;
  const files = opts.files.length > 0 ? opts.files : ["."];


   // Checkout out the branch should be a no-op if the branch was already checked out
  if (remoteExists(branch)) {
    runCommand(`git fetch origin "${branch}"`, { cwd: repoRoot });
    try {
      runCommand(`git checkout "${branch}"`, { cwd: repoRoot });
    } catch {
      runCommand(`git checkout -B "${branch}" "origin/${branch}"`, { cwd: repoRoot });
    }
  } else {
    runCommand(`git checkout -B "${branch}"`, { cwd: repoRoot });
  }

  runCommand(`git add --all ${files.map((file) => `"${file}"`).join(" ")}`, {
    cwd: repoRoot,
    shell: "/bin/bash",
  });

  if (!shouldCommit()) {
    console.log(`No changes for ${branch}; skipping push.`);
    return;
  }

  runCommand(`git config user.name "stripe-ai-sync[bot]"`, { cwd: repoRoot });
  runCommand(`git config user.email "282683001+stripe-ai-sync[bot]@users.noreply.github.com"`, {
    cwd: repoRoot,
  });

  runCommand(`git commit -m "${opts.message}"`, { cwd: repoRoot });
  runCommand(`git remote set-url origin "${remoteUrl}"`, { cwd: repoRoot });
  runCommand(`git push origin HEAD:"${branch}"`, { cwd: repoRoot });

  console.log(`Pushed ${branch} to GitHub.`);
};

try {
  runPush();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

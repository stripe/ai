#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");

const { execSync } = require("child_process");
const { parseArgs } = require("util");

const runCommand = (command, options = {}) => {
  execSync(command, { stdio: "inherit", ...options });
};


const prepareBranch = (branch) => {
  try {
    runCommand(`git fetch origin "${branch}" || true`);
    try {
      runCommand(`git show-ref --verify --quiet refs/remotes/origin/${branch}`);
      runCommand(`git checkout -B "${branch}" "origin/${branch}"`);
    } catch {
      runCommand(`git checkout -B "${branch}"`);
    }
  } catch (error) {
    throw new Error(`Error: could not prepare branch ${branch}`);
  }
};

const removeTargetContents = async (targetDir) => {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    await fs.rm(path.join(targetDir, entry.name), { recursive: true, force: true });
  }
};

const copyDirectory = async (sourceDir, targetDir) => {
  await fs.mkdir(targetDir, { recursive: true });

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
  }
};

const run = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      source: { type: "string" },
      target: { type: "string" },
      branch: { type: "string" },
    },
  });
  const { source, target, branch } = values;
  const resolvedSource = path.resolve(source);
  const resolvedTarget = path.resolve(target);

  const sourceStat = await fs.stat(resolvedSource).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Source directory not found: ${resolvedSource}`);
  }

  prepareBranch(branch);

  await fs.mkdir(resolvedTarget, { recursive: true });
  await removeTargetContents(resolvedTarget);
  await copyDirectory(resolvedSource, resolvedTarget);

  console.log(`Synced ${resolvedSource} over to ${resolvedTarget} on branch ${branch}`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

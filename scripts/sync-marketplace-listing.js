#!/usr/bin/env node
"use strict";

// Keeps a plugin listing in an external marketplace manifest in sync with a
// plugin manifest maintained in this repo.
//
// On each run this script:
//   1. Reads the source plugin manifest (name, version, description, ...).
//   2. Fetches the current listing for that plugin from the target repo's
//      marketplace manifest.
//   3. If the source manifest's version is newer than what's currently
//      listed, opens a pull request against the target repo updating the
//      listing (description, version, and any other synced fields).
//
// Because this repo doesn't cut a single ref/tag across the whole
// repository for individual plugins, the listing is anchored to the latest
// commit SHA that touched the plugin's source directory, rather than a
// version tag.
//
// Configuration is provided via environment variables so this script can be
// reused for other plugin directories, manifests, or target repos:
//   SOURCE_MANIFEST_PATH   Path (relative to repo root) to the plugin manifest to read from.
//   SOURCE_PLUGIN_DIR      Path (relative to repo root) to the plugin's source directory,
//                          used to compute the anchor commit SHA.
//   SOURCE_REPO            "owner/repo" of this repo, used when writing the listing's source.repo.
//   TARGET_REPO            "owner/repo" of the repo hosting the marketplace manifest.
//   TARGET_MANIFEST_PATH   Path (relative to the target repo root) to the marketplace manifest.
//   PLUGIN_ENTRY_NAME      The "name" field of the listing entry to keep in sync.
//   DRY_RUN                If "true", print the computed update instead of opening a PR.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, execSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");

const SOURCE_MANIFEST_PATH =
  process.env.SOURCE_MANIFEST_PATH ||
  "providers/agent-plugins/plugin/plugin.json";
const SOURCE_PLUGIN_DIR =
  process.env.SOURCE_PLUGIN_DIR || "providers/agent-plugins/plugin";
const SOURCE_REPO = process.env.SOURCE_REPO || "stripe/ai";
const TARGET_REPO = process.env.TARGET_REPO || "github/awesome-copilot";
const TARGET_MANIFEST_PATH =
  process.env.TARGET_MANIFEST_PATH || ".github/plugin/marketplace.json";
const PLUGIN_ENTRY_NAME = process.env.PLUGIN_ENTRY_NAME || "stripe";
const DRY_RUN = process.env.DRY_RUN === "true";

const sh = (cmd, opts = {}) =>
  execSync(cmd, { encoding: "utf8", cwd: REPO_ROOT, ...opts }).trim();

const gh = (args, opts = {}) =>
  execFileSync("gh", args, { encoding: "utf8", ...opts }).trim();

const compareVersions = (a, b) => {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const readSourceManifest = () => {
  const manifestPath = path.join(REPO_ROOT, SOURCE_MANIFEST_PATH);
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
};

// Latest commit on the current branch that touched the plugin's source
// directory. Used to anchor the listing since this repo doesn't tag
// individual plugin releases.
const getLatestPluginSha = () =>
  sh(`git log -1 --format=%H -- "${SOURCE_PLUGIN_DIR}"`);

const fetchTargetManifest = () => {
  const raw = gh([
    "api",
    `repos/${TARGET_REPO}/contents/${TARGET_MANIFEST_PATH}`,
    "-H",
    "Accept: application/vnd.github.raw",
  ]);
  return JSON.parse(raw);
};

const getDefaultBranch = () =>
  gh([
    "repo",
    "view",
    TARGET_REPO,
    "--json",
    "defaultBranchRef",
    "--jq",
    ".defaultBranchRef.name",
  ]);

const getAuthenticatedLogin = () => gh(["api", "user", "--jq", ".login"]);

const buildUpdatedEntry = (entry, manifest, sha) => {
  const updated = { ...entry };

  if (manifest.description) updated.description = manifest.description;
  updated.version = manifest.version;
  if (manifest.license) updated.license = manifest.license;
  if (manifest.keywords) updated.keywords = manifest.keywords;
  if (manifest.homepage) updated.homepage = manifest.homepage;
  if (manifest.author) updated.author = manifest.author;
  if (manifest.repository) updated.repository = manifest.repository;

  updated.source = {
    source: "github",
    repo: SOURCE_REPO,
    path: SOURCE_PLUGIN_DIR,
    ref: sha,
  };

  return updated;
};

// Forks the target repo (a no-op if a fork already exists), syncs the fork's
// default branch with upstream, pushes a branch with the updated manifest,
// and opens a pull request. Using a fork keeps this working regardless of
// whether the token has direct write access to the target repo.
const openPullRequest = (version, sha, updatedManifest) => {
  const branch = `update-${PLUGIN_ENTRY_NAME}-plugin-${version}`;
  const defaultBranch = getDefaultBranch();
  const login = getAuthenticatedLogin();
  const [, targetName] = TARGET_REPO.split("/");
  const forkRepo = `${login}/${targetName}`;

  console.log(`Ensuring a fork of ${TARGET_REPO} exists at ${forkRepo}...`);
  try {
    gh(["repo", "fork", TARGET_REPO, "--clone=false", "--remote=false"]);
  } catch (err) {
    // Forking is idempotent from a user's perspective; the CLI can still
    // exit non-zero if the fork already exists depending on gh version.
    console.log(`  (fork step reported: ${err.message.split("\n")[0]})`);
  }

  console.log(`Syncing fork's ${defaultBranch} branch with upstream...`);
  gh(["repo", "sync", forkRepo, "--source", TARGET_REPO, "--force"]);

  const existingPr = gh([
    "pr",
    "list",
    "--repo",
    TARGET_REPO,
    "--head",
    `${login}:${branch}`,
    "--state",
    "open",
    "--json",
    "url",
  ]);
  const existing = JSON.parse(existingPr || "[]");
  if (existing.length > 0) {
    console.log(`An open PR already exists: ${existing[0].url}`);
    return;
  }

  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "marketplace-listing-"),
  );
  console.log(`Cloning ${forkRepo} into ${tmpDir}...`);
  gh(["repo", "clone", forkRepo, tmpDir, "--", "--depth=1"]);

  const cloneOpts = { encoding: "utf8", cwd: tmpDir };
  execSync(`git checkout -b ${branch}`, cloneOpts);

  const manifestFile = path.join(tmpDir, TARGET_MANIFEST_PATH);
  fs.writeFileSync(
    manifestFile,
    JSON.stringify(updatedManifest, null, 2) + "\n",
    "utf8",
  );

  execSync(`git add "${TARGET_MANIFEST_PATH}"`, cloneOpts);
  const botName = "stripe-ai-sync[bot]";
  const botEmail = "282683001+stripe-ai-sync[bot]@users.noreply.github.com";
  execSync(
    `git -c user.name="${botName}" -c user.email="${botEmail}" commit -m "Update ${PLUGIN_ENTRY_NAME} plugin listing to v${version}"`,
    cloneOpts,
  );
  execSync(`git push origin ${branch}`, cloneOpts);

  const title = `Update ${PLUGIN_ENTRY_NAME} plugin listing to v${version}`;
  const body = [
    `Updates the \`${PLUGIN_ENTRY_NAME}\` plugin listing to match the latest published manifest:`,
    "",
    `- Version: \`${version}\``,
    `- Anchored to commit: \`${sha}\``,
    "",
    "This listing is anchored to a commit SHA rather than a tag, since releases for this plugin aren't cut as repository-wide refs.",
    "",
    "_Opened automatically by a scheduled sync workflow._",
  ].join("\n");

  console.log("Opening pull request...");
  const prUrl = gh([
    "pr",
    "create",
    "--repo",
    TARGET_REPO,
    "--base",
    defaultBranch,
    "--head",
    `${login}:${branch}`,
    "--title",
    title,
    "--body",
    body,
  ]);
  console.log(prUrl);
};

const run = () => {
  const manifest = readSourceManifest();
  console.log(`Source plugin manifest: ${manifest.name}@${manifest.version}`);

  const targetManifest = fetchTargetManifest();
  const entry = (targetManifest.plugins || []).find(
    (p) => p.name === PLUGIN_ENTRY_NAME,
  );

  if (!entry) {
    console.log(
      `No existing "${PLUGIN_ENTRY_NAME}" entry found in ${TARGET_REPO}/${TARGET_MANIFEST_PATH}. ` +
        "The initial listing needs to be added manually before this workflow can keep it in sync.",
    );
    return;
  }

  if (compareVersions(manifest.version, entry.version || "0.0.0") <= 0) {
    console.log(
      `Target already lists version ${entry.version}; no update needed.`,
    );
    return;
  }

  console.log(
    `Version increment detected: ${entry.version} -> ${manifest.version}`,
  );

  const sha = getLatestPluginSha();
  console.log(`Anchoring listing to latest commit: ${sha}`);

  const updatedEntry = buildUpdatedEntry(entry, manifest, sha);
  const updatedPlugins = targetManifest.plugins.map((p) =>
    p.name === PLUGIN_ENTRY_NAME ? updatedEntry : p,
  );
  const updatedManifest = { ...targetManifest, plugins: updatedPlugins };

  if (DRY_RUN) {
    console.log(
      "DRY_RUN is set; printing the updated entry instead of opening a PR:",
    );
    console.log(JSON.stringify(updatedEntry, null, 2));
    return;
  }

  openPullRequest(manifest.version, sha, updatedManifest);
};

try {
  run();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

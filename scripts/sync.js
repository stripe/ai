const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");

const BASE_URL = "https://docs.stripe.com/.well-known/skills";

const fetchText = (url) => {
  try {
    return execSync(
      `curl -sf --user-agent "github.com/stripe/ai/skills" "${url}"`,
      { encoding: "utf8" },
    );
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err.message}`);
  }
};

const fetchManifest = () => {
  const text = fetchText(`${BASE_URL}/index.json`);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse manifest: ${err.message}`);
  }
};

const PRESERVE_FILES = new Set(["README.md", ".gitkeep"]);
const OMIT_FILES = new Set(["metadata.yaml"]);
// Skills that are locally managed and should not be removed during sync.
// Add skill directory names here to protect them from being cleaned up.
const LOCAL_SKILLS = new Set(["connect-recommend"]);

const cleanDirectory = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (PRESERVE_FILES.has(entry.name)) continue;
    if (entry.isDirectory() && LOCAL_SKILLS.has(entry.name)) continue;
    await fs.rm(path.join(dir, entry.name), { recursive: true, force: true });
  }
};

const REPO_ROOT = path.join(__dirname, "..");

const SKILLS_DIR = path.join(__dirname, "../skills");
const PLUGIN_SKILLS_DIRS = [
  path.join(__dirname, "../providers/claude/plugin/skills"),
  path.join(__dirname, "../providers/cursor/plugin/skills"),
];
const ALL_OUTPUT_DIRS = [SKILLS_DIR, ...PLUGIN_SKILLS_DIRS];

const VERSION_FILES = [
  path.join(__dirname, "../.claude-plugin/marketplace.json"),
  path.join(__dirname, "../providers/claude/plugin/.claude-plugin/plugin.json"),
  path.join(__dirname, "../.cursor-plugin/marketplace.json"),
  path.join(__dirname, "../providers/cursor/plugin/.cursor-plugin/plugin.json"),
];

const bumpVersion = (version, type) => {
  const [major, minor, patch] = version.split(".").map(Number);
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

const updateVersionFile = async (filePath, bumpType) => {
  const raw = await fs.readFile(filePath, "utf8");
  const content = JSON.parse(raw);
  if (content.version) {
    content.version = bumpVersion(content.version, bumpType);
  }
  if (content.plugins) {
    for (const plugin of content.plugins) {
      if (plugin.version) plugin.version = bumpVersion(plugin.version, bumpType);
    }
  }
  await fs.writeFile(filePath, JSON.stringify(content, null, 2) + "\n", "utf8");
  console.log(`  Bumped version in: ${path.relative(REPO_ROOT, filePath)}`);
};

// Returns { added, deleted, modified } by inspecting git working-tree status
// for the canonical skills directory after files have been written.
const getGitSkillChanges = () => {
  const skillsRel = path.relative(REPO_ROOT, SKILLS_DIR);
  try {
    const output = execSync(`git status --porcelain -- "${skillsRel}"`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    const lines = output.trim().split("\n").filter(Boolean);
    // porcelain format: "XY path" where X=index, Y=worktree; "??" = untracked
    const added = lines.some((l) => l.startsWith("??"));
    const deleted = lines.some((l) => l[1] === "D");
    const modified = lines.some((l) => !l.startsWith("??") && l[1] !== "D");
    return { added, deleted, modified };
  } catch {
    return { added: false, deleted: false, modified: false };
  }
};

const run = async () => {
  const manifest = fetchManifest();
  const skills = manifest.skills;
  console.log(`Found ${skills.length} skills`);

  for (const dir of ALL_OUTPUT_DIRS) {
    await fs.mkdir(dir, { recursive: true });
    await cleanDirectory(dir);
  }

  let errors = 0;
  for (const skill of skills) {
    console.log(`Syncing skill: ${skill.name}`);

    const skillFiles = skill.files.filter(fileName => !OMIT_FILES.has(fileName));
    for (const file of skillFiles) {
      const url = `${BASE_URL}/${skill.name}/${file}`;
      let content;
      try {
        content = fetchText(url);
      } catch (err) {
        console.error(`  Error: ${err.message}`);
        errors++;
        continue;
      }

      for (const dir of ALL_OUTPUT_DIRS) {
        const outputPath = path.join(dir, skill.name, file);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content, "utf8");
        console.log(`  Written: ${outputPath}`);
      }
    }
  }

  if (errors > 0) {
    throw new Error(`Sync completed with ${errors} error(s)`);
  }

  const { added, deleted, modified } = getGitSkillChanges();
  if (added || deleted || modified) {
    const bumpType = added || deleted ? "minor" : "patch";
    console.log(`Skills changed (type: ${bumpType}), bumping plugin versions`);
    for (const versionFile of VERSION_FILES) {
      await updateVersionFile(versionFile, bumpType);
    }
  } else {
    console.log("No skill changes detected, skipping version bump");
  }
};

run().catch((err) => {
  console.error(err.message);
  console.error(
    "Encountered an error while fetching skills, skills will not be updated. Try triggering the workflow manually.",
  );
  process.exit(1);
});

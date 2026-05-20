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

const cleanDirectory = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "README.md") continue;
    await fs.rm(path.join(dir, entry.name), { recursive: true, force: true });
  }
};

const OUTPUT_LOCATIONS = [
  path.join(__dirname, "../skills"),
  path.join(__dirname, "../providers/claude/plugin/skills"),
  path.join(__dirname, "../providers/cursor/plugin/skills"),
];

const run = async () => {
  const manifest = fetchManifest();
  const skills = manifest.skills;
  console.log(`Found ${skills.length} skills`);

  for (const location of OUTPUT_LOCATIONS) {
    await fs.mkdir(location, { recursive: true });
    await cleanDirectory(location);
  }

  let errors = 0;
  for (const skill of skills) {
    console.log(`Syncing skill: ${skill.name}`);

    for (const file of skill.files) {
      const url = `${BASE_URL}/${skill.name}/${file}`;
      let content;
      try {
        content = fetchText(url);
      } catch (err) {
        console.error(`  Error: ${err.message}`);
        errors++;
        continue;
      }

      for (const location of OUTPUT_LOCATIONS) {
        const outputPath = path.join(location, skill.name, file);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content, "utf8");
        console.log(`  Written: ${outputPath}`);
      }
    }
  }

  if (errors > 0) {
    throw new Error(`Sync completed with ${errors} error(s)`);
  }
};

run().catch((err) => {
  console.error(err.message);
  console.error(
    "Encountered an error while fetching skills, skills will not be updated. Try triggering the workflow manually.",
  );
  process.exit(1);
});

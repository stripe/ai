const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");

const BASE_URL = "https://docs.stripe.com/.well-known/skills";

const fetchText = (url) => {
  try {
    return execSync(
      `curl -sf --user-agent "github.com/stripe/ai/skills" "${url}"`,
      { encoding: "utf8" }
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

const run = async () => {
  const manifest = fetchManifest();
  const skills = manifest.skills;
  console.log(`Found ${skills.length} skills`);

  // Define all locations where skills should be written
  const outputLocations = [
    __dirname, // skills/ (source of truth)
    path.join(__dirname, "../providers/claude/plugin/skills"),
    path.join(__dirname, "../providers/cursor/plugin/skills"),
  ];

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

      for (const location of outputLocations) {
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
  console.error("Encountered an error while fetching skills, skills will not be updated. Try triggering the workflow manually.");
  process.exit(1);
});

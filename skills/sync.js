const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");

const BASE_URL = "https://docs.stripe.com/.well-known/skills";

const fetchText = (url) => {
  return execSync(
    `curl -sf --user-agent "github.com/stripe/ai/skills" "${url}"`,
    { encoding: "utf8" }
  );
};

const fetchManifest = () => {
  return JSON.parse(fetchText(`${BASE_URL}/index.json`));
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

  for (const skill of skills) {
    console.log(`Syncing skill: ${skill.name}`);

    for (const file of skill.files) {
      const url = `${BASE_URL}/${skill.name}/${file}`;
      const content = fetchText(url);

      for (const location of outputLocations) {
        const outputPath = path.join(location, skill.name, file);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, content, "utf8");
        console.log(`  Written: ${outputPath}`);
      }
    }
  }
};

run();

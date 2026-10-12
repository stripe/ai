const fs = require("node:fs");
const path = require("node:path");

// To run: node scripts/copy-hook-scripts.js

function copyFolder(source, destination) {
  try {
    fs.cpSync(source, destination, { recursive: true });
    console.log('Folder copied successfully!');
  } catch (err) {
    console.error('Error copying folder:', err);
  }
}

const SOURCE_DIRECTORY = "providers/shared-provider-scripts/provider-hooks"
const TARGET_PROVIDERS = {
  claude: {hooks: ["postToolBatch", "postToolUse", "postToolUseFailure", "sessionStart", "userPromptSubmit"]},
}

for (const [provider, {hooks}] of Object.entries(TARGET_PROVIDERS)) {
  const pluginScriptsPath = `providers/${provider}/plugin/scripts`;
  fs.rmSync(pluginScriptsPath, { recursive: true, force: true });
  fs.mkdirSync(pluginScriptsPath, { recursive: true });
  copyFolder(SOURCE_DIRECTORY, pluginScriptsPath);

  const lifecycleDir = path.join(pluginScriptsPath, "lifecycle");
  const keepFiles = new Set(hooks.map((hook) => `${hook}.mjs`));
  for (const file of fs.readdirSync(lifecycleDir)) {
    if (!keepFiles.has(file)) {
      fs.rmSync(path.join(lifecycleDir, file));
    }
  }
}

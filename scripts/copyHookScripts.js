import fs from "node:fs";

// To run: node scripts/copyHookScripts.mjs

function copyFolder(source, destination) {
  try {
    fs.cpSync(source, destination, { recursive: true });
    console.log('Folder copied successfully!');
  } catch (err) {
    console.error('Error copying folder:', err);
  }
}

const SOURCE_DIRECTORY = "providers/provider_hooks"
const TARGET_PROVIDERS = ["claude"]

for (const provider of TARGET_PROVIDERS) {
  const pluginScriptsPath = `providers/${provider}/plugin/scripts`;
  fs.rmSync(pluginScriptsPath, { recursive: true, force: true });
  fs.mkdirSync(pluginScriptsPath, { recursive: true });
  copyFolder(SOURCE_DIRECTORY, pluginScriptsPath);
}

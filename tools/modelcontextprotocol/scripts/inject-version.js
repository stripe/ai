/**
 * Injects the package version into the compiled output.
 * Replaces process.env.PACKAGE_VERSION with the actual version string
 * at build time, consistent with how the shared toolkit handles versioning
 * via tsup's define option.
 */
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const version = pkg.version;

const userAgentPath = path.join(__dirname, '..', 'dist', 'userAgent.js');
let content = fs.readFileSync(userAgentPath, 'utf8');
content = content.replace(
  'process.env.PACKAGE_VERSION',
  JSON.stringify(version)
);
fs.writeFileSync(userAgentPath, content);

console.log(`Injected version ${version} into dist/userAgent.js`);

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const test = require("node:test");

const destinations = [
  "skills",
  ...["claude", "cursor", "grok", "agent-plugins"].map(
    (provider) => `providers/${provider}/plugin/skills`,
  ),
];
const versionFiles = [
  ...["claude", "cursor", "grok"].flatMap((provider) => [
    `.${provider}-plugin/marketplace.json`,
    `providers/${provider}/plugin/.${provider}-plugin/plugin.json`,
  ]),
  "providers/agent-plugins/plugin/plugin.json",
];
const downloads = ["alpha/SKILL.md", "alpha/references/guide.md", "beta/SKILL.md"];

function fixture(t, { failures = [], manifest, status = "", absent = false } = {}) {
  const root = fs.mkdtempSync(path.join(tmpdir(), "stripe-sync-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  write("scripts/sync.js", fs.readFileSync(path.join(__dirname, "sync.js")));
  for (const file of versionFiles) {
    write(file, JSON.stringify(file.endsWith("marketplace.json")
      ? { name: "stripe", plugins: [{ name: "stripe", version: "1.2.3" }] }
      : { name: "stripe", version: "1.2.3" }));
  }
  if (!absent) {
    for (const dir of destinations) {
      for (const file of ["alpha/SKILL.md", "beta/SKILL.md", "stale/SKILL.md", "README.md", ".gitkeep"]) {
        write(`${dir}/${file}`, `previous ${dir}/${file}\n`);
      }
    }
  }
  write("responses.json", JSON.stringify({
    "index.json": manifest ?? JSON.stringify({ skills: [
      { name: "alpha", files: ["SKILL.md", "references/guide.md", "metadata.yaml"] },
      { name: "beta", files: ["SKILL.md"] },
    ] }),
    ...Object.fromEntries(downloads.map((file) => [file, `downloaded ${file}\n`])),
  }));
  write("bin/curl", `#!${process.execPath}
const fs = require("node:fs");
const file = process.argv.at(-1).split("/.well-known/skills/")[1];
fs.appendFileSync("curl.log", file + "\\n");
const responses = JSON.parse(fs.readFileSync("responses.json", "utf8"));
if (${JSON.stringify(failures)}.includes(file) || !(file in responses)) process.exit(22);
process.stdout.write(responses[file]);
`);
  write("bin/git", `#!${process.execPath}
require("node:fs").appendFileSync("git.log", process.argv.slice(2).join(" ") + "\\n");
process.stdout.write(${JSON.stringify(status)});
`);
  for (const executable of ["curl", "git"]) fs.chmodSync(path.join(root, "bin", executable), 0o755);
  const snapshot = (relative) => {
    const target = path.join(root, relative);
    if (!fs.existsSync(target)) return null;
    if (!fs.statSync(target).isDirectory()) return fs.readFileSync(target);
    return Object.fromEntries(fs.readdirSync(target).sort().map((name) => [name, snapshot(`${relative}/${name}`)]));
  };
  return {
    snapshot,
    run: () => spawnSync(process.execPath, ["scripts/sync.js"], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
      env: { ...process.env, PATH: `${path.join(root, "bin")}${path.delimiter}${process.env.PATH}` },
    }),
  };
}

for (const [name, options, expectedError, attempted] of [
  ["one failed download", { failures: ["beta/SKILL.md"] }, /Sync completed with 1 error\(s\)/, ["index.json", ...downloads]],
  ["multiple failed downloads", { failures: ["alpha/SKILL.md", "beta/SKILL.md"] }, /Sync completed with 2 error\(s\)/, ["index.json", ...downloads]],
  ["manifest fetch failure", { failures: ["index.json"] }, /Failed to fetch/, ["index.json"]],
  ["malformed manifest", { manifest: "{" }, /Failed to parse manifest/, ["index.json"]],
  ["failed download with absent destinations", { failures: ["beta/SKILL.md"], absent: true }, /Sync completed with 1 error\(s\)/, ["index.json", ...downloads]],
]) {
  test(`${name} preserves destinations and versions`, (t) => {
    const { snapshot, run } = fixture(t, options);
    const files = [...destinations, ...versionFiles];
    const before = files.map(snapshot);
    const result = run();
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, expectedError);
    assert.deepEqual(files.map(snapshot), before);
    assert.equal(snapshot("curl.log").toString(), attempted.join("\n") + "\n");
    assert.equal(snapshot("git.log"), null);
  });
}

for (const [name, status, version] of [
  ["no changes", "", "1.2.3"],
  ["modifications", " M skills/alpha/SKILL.md\n", "1.2.4"],
  ["additions", "?? skills/alpha/\n", "1.3.0"],
  ["deletions", " M skills/alpha/SKILL.md\n D skills/stale/SKILL.md\n", "1.3.0"],
]) {
  test(`successful sync publishes all files and handles ${name}`, (t) => {
    const { snapshot, run } = fixture(t, { status });
    const beforeVersions = versionFiles.map(snapshot);
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    for (const dir of destinations) {
      assert.deepEqual(snapshot(dir), {
        ".gitkeep": Buffer.from(`previous ${dir}/.gitkeep\n`),
        "README.md": Buffer.from(`previous ${dir}/README.md\n`),
        alpha: {
          "SKILL.md": Buffer.from("downloaded alpha/SKILL.md\n"),
          references: { "guide.md": Buffer.from("downloaded alpha/references/guide.md\n") },
        },
        beta: { "SKILL.md": Buffer.from("downloaded beta/SKILL.md\n") },
      });
    }
    assert.equal(snapshot("curl.log").toString(), ["index.json", ...downloads].join("\n") + "\n");
    assert.equal(snapshot("git.log").toString(), "status --porcelain -- skills\n");
    for (const file of versionFiles) {
      const content = JSON.parse(snapshot(file));
      assert.equal(content.version ?? content.plugins[0].version, version);
    }
    if (!status) assert.deepEqual(versionFiles.map(snapshot), beforeVersions);
  });
}

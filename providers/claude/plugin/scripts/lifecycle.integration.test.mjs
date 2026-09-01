import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  delimiter,
  dirname,
  join,
} from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CLI_NOT_INSTALLED_MESSAGE,
  CLI_NOT_LOGGED_IN_MESSAGE,
  CLI_OUTDATED_MESSAGE,
} from './cli.mjs';
import { PER_TURN_FEEDBACK_MESSAGE } from './feedback.mjs';

const SCRIPTS_ROOT = dirname(fileURLToPath(import.meta.url));

function writeTranscript(t, prompt) {
  const directory = mkdtempSync(join(tmpdir(), 'stripe-hooks-'));
  const transcriptPath = join(directory, 'transcript.jsonl');
  writeFileSync(
    transcriptPath,
    `${JSON.stringify({
      type: 'user',
      message: { role: 'user', content: prompt },
    })}\n`,
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return transcriptPath;
}

function runLifecycle(script, event, env = {}) {
  return spawnSync(process.execPath, [join(SCRIPTS_ROOT, script)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
    input: JSON.stringify(event),
    timeout: 10_000,
  });
}

function createBinDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), 'stripe-cli-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writeExecutable(directory, name, contents) {
  const executablePath = join(directory, name);
  writeFileSync(executablePath, contents);
  chmodSync(executablePath, 0o755);
}

test('sampled Stripe Stop emits soft context once', (t) => {
  const transcriptPath = writeTranscript(t, 'Help me integrate Stripe');
  const event = {
    hook_event_name: 'Stop',
    last_assistant_message: 'Done.',
    stop_hook_active: false,
    transcript_path: transcriptPath,
  };
  const env = {
    NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
      'Math.random = () => 0',
    )}`,
  };

  const firstStop = runLifecycle('lifecycle/stop.mjs', event, env);
  assert.ifError(firstStop.error);
  assert.equal(firstStop.status, 0);
  assert.deepEqual(JSON.parse(firstStop.stdout), {
    hookSpecificOutput: {
      additionalContext: PER_TURN_FEEDBACK_MESSAGE,
      hookEventName: 'Stop',
    },
  });

  const continued = runLifecycle(
    'lifecycle/stop.mjs',
    { ...event, stop_hook_active: true },
    env,
  );
  assert.ifError(continued.error);
  assert.equal(continued.status, 0);
  assert.equal(continued.stdout, '');
});

test('Stripe Skill usage is reported with its short name and silent failures', (t) => {
  const directory = createBinDirectory(t);
  const usageLog = join(directory, 'usage.log');
  writeExecutable(
    directory,
    'stripe',
    `#!/bin/sh
printf '%s\\n' "$*" >> "$STRIPE_USAGE_LOG"
echo "unsupported command"
echo "unsupported command" >&2
exit 1
`,
  );

  const result = runLifecycle(
    'lifecycle/postToolUse.mjs',
    {
      hook_event_name: 'PostToolUse',
      tool_input: { skill: 'stripe:stripe-docs' },
      tool_name: 'Skill',
    },
    {
      NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
        'Math.random = () => 1',
      )}`,
      PATH: `${directory}${delimiter}${process.env.PATH}`,
      STRIPE_USAGE_LOG: usageLog,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
  assert.ok(existsSync(usageLog), 'Stripe CLI was not invoked');
  assert.equal(
    readFileSync(usageLog, 'utf8').trim(),
    'agent report_usage --skill stripe-docs',
  );

  rmSync(usageLog);
  const unrelated = runLifecycle(
    'lifecycle/postToolUse.mjs',
    {
      hook_event_name: 'PostToolUse',
      tool_input: { skill: 'example:other-skill' },
      tool_name: 'Skill',
    },
    {
      PATH: `${directory}${delimiter}${process.env.PATH}`,
      STRIPE_USAGE_LOG: usageLog,
    },
  );
  assert.ifError(unrelated.error);
  assert.equal(unrelated.status, 0);
  assert.ok(!existsSync(usageLog), 'A non-Stripe Skill was reported');
});

test('SessionStart reports missing, outdated, and current CLI states', (t) => {
  const missing = runLifecycle(
    'lifecycle/sessionStart.mjs',
    { hook_event_name: 'SessionStart', source: 'startup' },
    { PATH: createBinDirectory(t) },
  );
  assert.ifError(missing.error);
  assert.equal(missing.status, 0);
  assert.equal(
    JSON.parse(missing.stdout).hookSpecificOutput.additionalContext,
    CLI_NOT_INSTALLED_MESSAGE,
  );

  const directory = createBinDirectory(t);
  writeExecutable(
    directory,
    'stripe',
    `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "stripe version $STRIPE_FAKE_VERSION"
  exit 0
fi
if [ "$1" = "config" ] && [ "$2" = "--list" ]; then
  printf '%s' "$STRIPE_FAKE_CONFIG"
  exit 0
fi
exit 1
`,
  );
  writeExecutable(
    directory,
    'npm',
    `#!/bin/sh
if [ "$1" = "view" ] && [ "$2" = "@stripe/cli" ] && [ "$3" = "version" ]; then
  if [ "$STRIPE_FAKE_NPM_FAILURE" = "1" ]; then
    exit 1
  fi
  echo "$STRIPE_FAKE_LATEST"
  exit 0
fi
exit 1
`,
  );

  const outdated = runLifecycle(
    'lifecycle/sessionStart.mjs',
    { hook_event_name: 'SessionStart', source: 'startup' },
    {
      PATH: directory,
      STRIPE_FAKE_CONFIG: '',
      STRIPE_FAKE_LATEST: '1.50.6',
      STRIPE_FAKE_VERSION: '1.50.1',
    },
  );
  assert.ifError(outdated.error);
  assert.equal(outdated.status, 0);
  assert.equal(
    JSON.parse(outdated.stdout).hookSpecificOutput.additionalContext,
    `${CLI_NOT_LOGGED_IN_MESSAGE} ${CLI_OUTDATED_MESSAGE}`,
  );

  const current = runLifecycle(
    'lifecycle/sessionStart.mjs',
    { hook_event_name: 'SessionStart', source: 'startup' },
    {
      PATH: directory,
      STRIPE_FAKE_CONFIG: 'account_id = acct_123',
      STRIPE_FAKE_LATEST: '1.50.6',
      STRIPE_FAKE_VERSION: '1.50.6',
    },
  );
  assert.ifError(current.error);
  assert.equal(current.status, 0);
  assert.equal(current.stdout, '');

  const registryFailure = runLifecycle(
    'lifecycle/sessionStart.mjs',
    { hook_event_name: 'SessionStart', source: 'startup' },
    {
      PATH: directory,
      STRIPE_FAKE_CONFIG: 'account_id = acct_123',
      STRIPE_FAKE_NPM_FAILURE: '1',
      STRIPE_FAKE_VERSION: '1.50.1',
    },
  );
  assert.ifError(registryFailure.error);
  assert.equal(registryFailure.status, 0);
  assert.equal(registryFailure.stdout, '');
});

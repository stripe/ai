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
import {
  AGENT_FEEDBACK_MESSAGE,
  PER_BATCH_FEEDBACK_MESSAGE,
  PER_TURN_FEEDBACK_MESSAGE,
  TOOL_FAILURE_FEEDBACK_MESSAGE,
} from './feedback.mjs';

const SCRIPTS_ROOT = dirname(fileURLToPath(import.meta.url));

function writeTranscriptEntries(t, entries) {
  const directory = mkdtempSync(join(tmpdir(), 'stripe-hooks-'));
  const transcriptPath = join(directory, 'transcript.jsonl');
  writeFileSync(
    transcriptPath,
    `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return transcriptPath;
}

function writeTranscript(t, prompt) {
  return writeTranscriptEntries(t, [
    {
      type: 'user',
      message: { role: 'user', content: prompt },
    },
  ]);
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

test('sampled UserPromptSubmit emits feedback about the previous turn', (t) => {
  const transcriptPath = writeTranscript(t, 'Help me integrate Stripe');
  const event = {
    hook_event_name: 'UserPromptSubmit',
    prompt: 'What should I do next?',
    transcript_path: transcriptPath,
  };
  const env = {
    NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
      'Math.random = () => 0',
    )}`,
  };

  const result = runLifecycle(
    'lifecycle/userPromptSubmit.mjs',
    event,
    env,
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    hookSpecificOutput: {
      additionalContext: PER_TURN_FEEDBACK_MESSAGE,
      hookEventName: 'UserPromptSubmit',
    },
  });
});

test('UserPromptSubmit checks only the immediately preceding turn', (t) => {
  const transcriptPath = writeTranscriptEntries(t, [
    {
      type: 'user',
      message: { role: 'user', content: 'Help me integrate Stripe' },
    },
    {
      type: 'assistant',
      message: { role: 'assistant', content: 'Done.' },
    },
    {
      type: 'user',
      message: { role: 'user', content: 'Now explain CSS grid' },
    },
    {
      type: 'assistant',
      message: { role: 'assistant', content: 'Use display: grid.' },
    },
  ]);

  const result = runLifecycle(
    'lifecycle/userPromptSubmit.mjs',
    {
      hook_event_name: 'UserPromptSubmit',
      prompt: 'What should I do next?',
      transcript_path: transcriptPath,
    },
    {
      NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
        'Math.random = () => 0',
      )}`,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
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
        'Math.random = () => 0',
      )}`,
      PATH: `${directory}${delimiter}${process.env.PATH}`,
      STRIPE_API_KEY: '',
      STRIPE_USAGE_LOG: usageLog,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(
    result.stderr,
    "DEBUG: Would've called stripe agent report_usage --type skill --name stripe-docs\n",
  );
  assert.equal(result.stdout, '');
  assert.ok(existsSync(usageLog), 'Stripe CLI was not invoked');
  assert.equal(
    readFileSync(usageLog, 'utf8').trim(),
    'agent report_usage --type skill --name stripe-docs',
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
      STRIPE_API_KEY: '',
      STRIPE_USAGE_LOG: usageLog,
    },
  );
  assert.ifError(unrelated.error);
  assert.equal(unrelated.status, 0);
  assert.equal(unrelated.stdout, '');
  assert.ok(!existsSync(usageLog), 'A non-Stripe Skill was reported');
});

test('sampled PostToolBatch emits feedback for Stripe tools', () => {
  const result = runLifecycle(
    'lifecycle/postToolBatch.mjs',
    {
      hook_event_name: 'PostToolBatch',
      tool_calls: [
        {
          tool_input: { query: 'Checkout' },
          tool_name: 'mcp__stripe__search_stripe_documentation',
          tool_response: 'Search results',
          tool_use_id: 'toolu_stripe',
        },
      ],
    },
    {
      NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
        'Math.random = () => 0',
      )}`,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    hookSpecificOutput: {
      additionalContext: PER_BATCH_FEEDBACK_MESSAGE,
      hookEventName: 'PostToolBatch',
    },
  });
});

test('PostToolBatch ignores batches without Stripe tools', () => {
  const result = runLifecycle(
    'lifecycle/postToolBatch.mjs',
    {
      hook_event_name: 'PostToolBatch',
      tool_calls: [
        {
          tool_input: { file_path: '/tmp/example' },
          tool_name: 'Read',
          tool_response: 'contents',
          tool_use_id: 'toolu_read',
        },
      ],
    },
    {
      NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
        'Math.random = () => 0',
      )}`,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});

test('PostToolBatch defers failed Stripe tools to PostToolUseFailure', () => {
  const result = runLifecycle(
    'lifecycle/postToolBatch.mjs',
    {
      hook_event_name: 'PostToolBatch',
      tool_calls: [
        {
          tool_input: { query: 'Checkout' },
          tool_name: 'mcp__stripe__search_stripe_documentation',
          tool_response: 'MCP error -32603: request failed',
          tool_use_id: 'toolu_stripe',
        },
      ],
    },
    {
      NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
        'Math.random = () => 0',
      )}`,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});

test('PostToolUseFailure always asks about failed Stripe Skills', () => {
  const result = runLifecycle(
    'lifecycle/postToolUseFailure.mjs',
    {
      error: 'Skill failed to load',
      hook_event_name: 'PostToolUseFailure',
      tool_input: { skill: 'stripe:stripe-docs' },
      tool_name: 'Skill',
      tool_use_id: 'toolu_skill',
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    hookSpecificOutput: {
      additionalContext: TOOL_FAILURE_FEEDBACK_MESSAGE,
      hookEventName: 'PostToolUseFailure',
    },
  });
});

test('PostToolUseFailure always asks about failed Stripe MCP tools', () => {
  const result = runLifecycle(
    'lifecycle/postToolUseFailure.mjs',
    {
      error: 'MCP error -32603: request failed',
      hook_event_name: 'PostToolUseFailure',
      tool_input: { query: 'Checkout' },
      tool_name: 'mcp__stripe__search_stripe_documentation',
      tool_use_id: 'toolu_mcp',
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    hookSpecificOutput: {
      additionalContext: TOOL_FAILURE_FEEDBACK_MESSAGE,
      hookEventName: 'PostToolUseFailure',
    },
  });
});

test('sampled PostToolUse asks the parent about Stripe-related Agent work', () => {
  const result = runLifecycle(
    'lifecycle/postToolUse.mjs',
    {
      hook_event_name: 'PostToolUse',
      tool_input: { prompt: 'Investigate the Stripe integration' },
      tool_name: 'Agent',
      tool_response: {
        content: [{ type: 'text', text: 'The investigation is complete.' }],
        status: 'completed',
      },
    },
    {
      NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
        'Math.random = () => 0',
      )}`,
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    hookSpecificOutput: {
      additionalContext: AGENT_FEEDBACK_MESSAGE,
      hookEventName: 'PostToolUse',
    },
  });
});

test('PostToolUse ignores unrelated and background Agent work', () => {
  for (const toolResponse of [
    {
      content: [{ type: 'text', text: 'CSS investigation complete.' }],
      status: 'completed',
    },
    {
      description: 'Investigate Stripe',
      status: 'async_launched',
    },
  ]) {
    const result = runLifecycle(
      'lifecycle/postToolUse.mjs',
      {
        hook_event_name: 'PostToolUse',
        tool_input: { prompt: 'Investigate CSS' },
        tool_name: 'Agent',
        tool_response: toolResponse,
      },
      {
        NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
          'Math.random = () => 0',
        )}`,
      },
    );

    assert.ifError(result.error);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  }
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

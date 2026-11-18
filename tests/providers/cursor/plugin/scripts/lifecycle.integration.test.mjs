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
import { delimiter, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CLI_NOT_INSTALLED_MESSAGE,
  CLI_NOT_LOGGED_IN_MESSAGE,
  CLI_OUTDATED_MESSAGE,
} from '../../../../../providers/cursor/plugin/scripts/cli.mjs';
import {
  AGENT_FEEDBACK_MESSAGE,
  TOOL_FAILURE_FEEDBACK_MESSAGE,
} from '../../../../../providers/cursor/plugin/scripts/feedback.mjs';

const SCRIPTS_ROOT = fileURLToPath(
  new URL('../../../../../providers/cursor/plugin/scripts/', import.meta.url),
);

const STRIPE_SKILL_PATH =
  '/home/user/.cursor/plugins/stripe/skills/stripe-docs/SKILL.md';
const OTHER_SKILL_PATH = '/home/user/project/.cursor/skills/other-skill/SKILL.md';

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

// Writes a Cursor-format JSONL transcript and returns its path.
function writeTranscript(t, entries) {
  const directory = mkdtempSync(join(tmpdir(), 'stripe-cursor-transcript-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const transcriptPath = join(directory, 'transcript.jsonl');
  writeFileSync(
    transcriptPath,
    `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
    'utf8',
  );
  return transcriptPath;
}

function transcriptUserPrompt(text) {
  return {
    role: 'user',
    message: {
      content: [
        {
          type: 'text',
          text: `<timestamp>Tuesday, Oct 13, 2026, 11:44 AM (UTC-4)</timestamp>\n<user_query>\n${text}\n</user_query>`,
        },
      ],
    },
  };
}

function transcriptAssistantReadingSkill(skillPath) {
  return {
    role: 'assistant',
    message: {
      content: [
        { type: 'text', text: 'Reading the skill.\n\n[REDACTED]' },
        { type: 'tool_use', name: 'Read', input: { path: skillPath } },
      ],
    },
  };
}

const TRANSCRIPT_TURN_ENDED = { type: 'turn_ended', status: 'success' };

function beforeSubmitPromptEvent(transcriptPath, prompt) {
  return {
    attachments: [],
    conversation_id: 'conv_123',
    hook_event_name: 'beforeSubmitPrompt',
    prompt,
    transcript_path: transcriptPath,
  };
}

const USAGE_LOGGING_STRIPE_CLI = `#!/bin/sh
printf '%s\\n' "$*" >> "$STRIPE_USAGE_LOG"
echo "unsupported command"
echo "unsupported command" >&2
exit 1
`;

// Usage reporting runs in a detached child that may outlive the hook, so the
// log can appear shortly after the hook process exits.
async function waitForFile(path, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    if (Date.now() > deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return true;
}

test('beforeSubmitPrompt reports Stripe Skill usage from the last assistant turn', async (t) => {
  const directory = createBinDirectory(t);
  const usageLog = join(directory, 'usage.log');
  writeExecutable(directory, 'stripe', USAGE_LOGGING_STRIPE_CLI);
  const env = {
    PATH: `${directory}${delimiter}${process.env.PATH}`,
    STRIPE_API_KEY: '',
    STRIPE_USAGE_LOG: usageLog,
  };

  const stripeTranscript = writeTranscript(t, [
    transcriptUserPrompt('Use the stripe-docs skill.'),
    transcriptAssistantReadingSkill(STRIPE_SKILL_PATH),
    TRANSCRIPT_TURN_ENDED,
  ]);
  const result = runLifecycle(
    'lifecycle/beforeSubmitPrompt.mjs',
    beforeSubmitPromptEvent(stripeTranscript, 'Now add a webhook handler.'),
    env,
  );
  assertSilentHook(result);
  assert.ok(await waitForFile(usageLog), 'Stripe CLI was not invoked');
  assert.equal(
    readFileSync(usageLog, 'utf8').trim(),
    'agent report_usage --type skill --name stripe-docs',
  );
});

test('feedback prompts provide direct, valid CLI guidance', () => {
  const messages = [
    AGENT_FEEDBACK_MESSAGE,
    TOOL_FAILURE_FEEDBACK_MESSAGE,
  ];

  for (const message of messages) {
    const feedbackRequestIndex = message.search(/send Stripe feedback/i);
    const exampleIndex = message.indexOf('For example:');
    const optionsIndex = message.indexOf(
      'Use positive, neutral, or negative honestly.',
    );
    const continueIndex = message.indexOf('Then continue');
    const approvalIndex = message.indexOf('Before submitting');
    const firstBetaIndex = message.indexOf('private beta');
    const lastBetaIndex = message.lastIndexOf('private beta');

    assert.ok(feedbackRequestIndex >= 0);
    assert.ok(feedbackRequestIndex < firstBetaIndex);
    assert.ok(firstBetaIndex < exampleIndex);
    assert.ok(exampleIndex < optionsIndex);
    assert.ok(optionsIndex < continueIndex);
    assert.ok(continueIndex < approvalIndex);
    assert.ok(approvalIndex < lastBetaIndex);
    assert.match(message, /stripe feedback --json --sentiment neutral/);
    assert.match(message, /positive, neutral, or negative/);
    assert.match(message, /stripe feedback --help/);
    assert.match(
      message,
      /Before submitting, show the prospective feedback to the user and ask for approval, mentioning that they may be invited to a private beta if Stripe is developing a solution to their problem\./,
    );
    assert.equal(message.match(/private beta/g)?.length, 2);
    assert.doesNotMatch(message, /\bconsider\b/i);
    assert.doesNotMatch(message, /distract the user/i);
  }
  assert.match(
    TOOL_FAILURE_FEEDBACK_MESSAGE,
    /^The Stripe tool failed\. Send Stripe feedback/,
  );
});

test('postToolUseFailure always asks about failed Stripe Skills', () => {
  const result = runLifecycle(
    'lifecycle/postToolUseFailure.mjs',
    {
      duration: 12,
      error_message: 'Skill failed to load',
      failure_type: 'error',
      hook_event_name: 'postToolUseFailure',
      is_interrupt: false,
      tool_input: { file_path: STRIPE_SKILL_PATH },
      tool_name: 'Read',
      tool_use_id: 'tool_skill',
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    additional_context: TOOL_FAILURE_FEEDBACK_MESSAGE,
  });
});

test('postToolUseFailure always asks about failed Stripe MCP tools', () => {
  const result = runLifecycle(
    'lifecycle/postToolUseFailure.mjs',
    {
      duration: 1500,
      error_message: 'MCP error -32603: request failed',
      failure_type: 'error',
      hook_event_name: 'postToolUseFailure',
      is_interrupt: false,
      tool_input: { query: 'Checkout' },
      tool_name: 'MCP:search_stripe_documentation',
      tool_use_id: 'tool_mcp',
    },
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    additional_context: TOOL_FAILURE_FEEDBACK_MESSAGE,
  });
});

test('sampled postToolUse asks the parent about Stripe-related Task work', () => {
  const result = runLifecycle(
    'lifecycle/postToolUse.mjs',
    {
      duration: 4200,
      hook_event_name: 'postToolUse',
      tool_input: { prompt: 'Investigate the Stripe integration' },
      tool_name: 'Task',
      tool_output: JSON.stringify({
        content: [{ type: 'text', text: 'The investigation is complete.' }],
        status: 'success',
      }),
      tool_use_id: 'tool_task',
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
    additional_context: AGENT_FEEDBACK_MESSAGE,
  });
});

test('sampled postToolUse treats Metronome-related Task work as Stripe work', () => {
  const result = runLifecycle(
    'lifecycle/postToolUse.mjs',
    {
      duration: 4200,
      hook_event_name: 'postToolUse',
      tool_input: { prompt: 'Set up Metronome rate cards for the new plan' },
      tool_name: 'Task',
      tool_output: JSON.stringify({
        content: [{ type: 'text', text: 'The rate cards are configured.' }],
        status: 'success',
      }),
      tool_use_id: 'tool_task',
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
    additional_context: AGENT_FEEDBACK_MESSAGE,
  });
});

test('postToolUse ignores unrelated and unfinished Task work', () => {
  for (const toolOutput of [
    {
      content: [{ type: 'text', text: 'CSS investigation complete.' }],
      status: 'success',
    },
    {
      description: 'Investigate Stripe',
      status: 'running',
    },
  ]) {
    const result = runLifecycle(
      'lifecycle/postToolUse.mjs',
      {
        duration: 4200,
        hook_event_name: 'postToolUse',
        tool_input: { prompt: 'Investigate CSS' },
        tool_name: 'Task',
        tool_output: JSON.stringify(toolOutput),
        tool_use_id: 'tool_task',
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

const sessionStartEvent = {
  composer_mode: 'agent',
  conversation_id: 'conv_123',
  hook_event_name: 'sessionStart',
  is_background_agent: false,
  session_id: 'conv_123',
};

test('sessionStart reports missing, outdated, and current CLI states', (t) => {
  const missing = runLifecycle('lifecycle/sessionStart.mjs', sessionStartEvent, {
    PATH: createBinDirectory(t),
  });
  assert.ifError(missing.error);
  assert.equal(missing.status, 0);
  assert.equal(
    JSON.parse(missing.stdout).additional_context,
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
if [ "$1" = "whoami" ] && [ "$2" = "--format" ] && [ "$3" = "json" ]; then
  if [ "$STRIPE_FAKE_AUTHENTICATED" = "1" ]; then
    echo '{"authenticated":true,"account_id":"acct_123"}'
    exit 0
  fi
  echo '{"authenticated":false}'
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

  const outdated = runLifecycle('lifecycle/sessionStart.mjs', sessionStartEvent, {
    PATH: directory,
    STRIPE_FAKE_LATEST: '1.50.6',
    STRIPE_FAKE_VERSION: '1.50.1',
  });
  assert.ifError(outdated.error);
  assert.equal(outdated.status, 0);
  assert.equal(
    JSON.parse(outdated.stdout).additional_context,
    `${CLI_NOT_LOGGED_IN_MESSAGE} ${CLI_OUTDATED_MESSAGE}`,
  );

  const current = runLifecycle(
    'lifecycle/sessionStart.mjs',
    sessionStartEvent,
    {
      PATH: directory,
      STRIPE_FAKE_AUTHENTICATED: '1',
      STRIPE_FAKE_LATEST: '1.50.6',
      STRIPE_FAKE_VERSION: '1.50.6',
    },
  );
  assert.ifError(current.error);
  assert.equal(current.status, 0);
  assert.equal(current.stdout, '');

  const registryFailure = runLifecycle(
    'lifecycle/sessionStart.mjs',
    sessionStartEvent,
    {
      PATH: directory,
      STRIPE_FAKE_AUTHENTICATED: '1',
      STRIPE_FAKE_NPM_FAILURE: '1',
      STRIPE_FAKE_VERSION: '1.50.1',
    },
  );
  assert.ifError(registryFailure.error);
  assert.equal(registryFailure.status, 0);
  assert.equal(registryFailure.stdout, '');
});

function assertSilentHook(result) {
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
}

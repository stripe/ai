import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  before as beforeAll,
  describe,
  it,
} from 'node:test';
import { fileURLToPath } from 'node:url';
import { CLI_NOT_INSTALLED_MESSAGE } from './cli.mjs';
import {
  PER_TOOL_FEEDBACK_SAMPLE_RATE,
  PER_TURN_FEEDBACK_SAMPLE_RATE,
} from './constants.mjs';
import {
  PER_BATCH_FEEDBACK_MESSAGE,
  PER_TURN_FEEDBACK_MESSAGE,
} from './feedback.mjs';

const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STRIPE_MCP_TOOL_PREFIXES = [
  'mcp__plugin_stripe_stripe__',
  'mcp__stripe__',
];

function parseEventStream(stdout) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // Claude can print local startup notices before the JSON event stream.
    }
  }
  return events;
}

function hookContext(event) {
  return hookOutput(event)?.hookSpecificOutput?.additionalContext;
}

function hookOutput(event) {
  for (const output of [event.output, ...String(event.output).split(/\r?\n/)]) {
    try {
      return JSON.parse(output);
    } catch {
      // Debug output can appear beside the hook's JSON response.
    }
  }
  return undefined;
}

function valueContains(value, expected) {
  if (typeof value === 'string') {
    return value.includes(expected);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueContains(item, expected));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) =>
      valueContains(item, expected),
    );
  }
  return false;
}

function transcriptContains(transcript, expected) {
  return transcript.split(/\r?\n/).some((line) => {
    try {
      return valueContains(JSON.parse(line), expected);
    } catch {
      return false;
    }
  });
}

describe('Stripe feedback hooks', { timeout: 120_000 }, () => {
  let events;
  let sessionStderr;
  let stripeMcpStatuses;
  let transcript;

  beforeAll(() => {
    const claudePath = spawnSync('which', ['claude'], {
      encoding: 'utf8',
    }).stdout.trim();
    assert.ok(claudePath, 'Claude CLI is not installed');

    const sessionId = randomUUID();
    const result = spawnSync(
      claudePath,
      [
        '--vanilla',
        '--plugin-dir',
        PLUGIN_ROOT,
        '--session-id',
        sessionId,
        '--name',
        'stripe-feedback-hooks-integration-test',
        '-p',
        'First use the stripe:stripe-docs skill. Then use ToolSearch if needed and call one tool from the Stripe MCP server to search Stripe documentation for Checkout. After both calls finish, reply with only DONE.',
        '--allowedTools',
        'Skill(stripe:*),ToolSearch,mcp__plugin_stripe_stripe__*,mcp__stripe__*',
        '--tools',
        'Skill,ToolSearch',
        '--output-format',
        'stream-json',
        '--include-hook-events',
        '--max-budget-usd',
        '0.10',
        '--model',
        'haiku',
        '--effort',
        'low',
        '--verbose',
      ],
      {
        cwd: PLUGIN_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
            'Math.random = () => 0.05',
          )}`,
        },
        maxBuffer: 16 * 1024 * 1024,
        timeout: 90_000,
      },
    );

    assert.ifError(result.error);
    assert.equal(
      result.status,
      0,
      `Claude session failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );

    events = parseEventStream(result.stdout);
    sessionStderr = result.stderr;
    const initialized = events.find(
      (event) => event.type === 'system' && event.subtype === 'init',
    );
    assert.ok(
      initialized?.plugins?.some(
        (plugin) =>
          plugin.name === 'stripe' && plugin.path === PLUGIN_ROOT,
      ),
      'Claude did not load the Stripe plugin from this checkout',
    );
    stripeMcpStatuses = initialized.mcp_servers
      ?.filter((server) => server.name.includes('stripe'))
      .map((server) => `${server.name}: ${server.status}`);

    const projectsDirectory = dirname(
      dirname(initialized.memory_paths.auto),
    );
    const projectDirectory = PLUGIN_ROOT.replaceAll('/', '-');
    const transcriptPath = join(
      projectsDirectory,
      projectDirectory,
      `${sessionId}.jsonl`,
    );
    assert.ok(
      existsSync(transcriptPath),
      `Claude did not persist the transcript at ${transcriptPath}`,
    );
    transcript = readFileSync(transcriptPath, 'utf8');
  });

  it('uses the intended feedback frequencies', () => {
    assert.equal(PER_TOOL_FEEDBACK_SAMPLE_RATE, 0.99);
    assert.equal(PER_TURN_FEEDBACK_SAMPLE_RATE, 0.99);
  });

  it('checks the Stripe CLI at SessionStart', () => {
    assert.ok(
      events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_started' &&
          event.hook_name === 'SessionStart:startup',
      ),
      'The SessionStart hook did not run',
    );
    assert.ok(
      !events.some(
        (event) =>
          event.hook_event === 'SessionStart' &&
          hookContext(event) === CLI_NOT_INSTALLED_MESSAGE,
      ),
      'The SessionStart hook incorrectly reported the Stripe CLI as missing',
    );
  });

  it('reports Stripe Skill usage and emits sampled batch feedback', () => {
    assert.ok(
      events.some(
        (event) =>
          event.type === 'assistant' &&
          event.message?.content?.some(
            (content) =>
              content.type === 'tool_use' &&
              content.name === 'Skill' &&
              content.input?.skill === 'stripe:stripe-docs',
          ),
      ),
      'Claude did not invoke the Stripe skill',
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_started' &&
          event.hook_name === 'PostToolUse:Skill',
      ),
      'The usage-reporting PostToolUse hook did not run',
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_response' &&
          event.hook_event === 'PostToolBatch' &&
          event.hook_name === 'PostToolBatch' &&
          hookContext(event) === PER_BATCH_FEEDBACK_MESSAGE,
      ),
      `The PostToolBatch hook did not emit Stripe feedback: ${JSON.stringify(
        events.filter(
          (event) =>
            event.hook_event === 'PostToolBatch' ||
            event.hook_name === 'PostToolBatch',
        ),
      )}`,
    );
    assert.ok(transcriptContains(transcript, PER_BATCH_FEEDBACK_MESSAGE));
  });

  it('emits sampled feedback after a Stripe MCP tool', () => {
    const mcpToolCall = events
      .filter((event) => event.type === 'assistant')
      .flatMap((event) => event.message?.content ?? [])
      .find(
        (content) =>
          content.type === 'tool_use' &&
          STRIPE_MCP_TOOL_PREFIXES.some((prefix) =>
            content.name.startsWith(prefix),
          ),
      );
    assert.ok(
      mcpToolCall,
      `Claude did not invoke a Stripe MCP tool (${stripeMcpStatuses?.join(
        ', ',
      ) ?? 'server status unknown'})`,
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_response' &&
          event.hook_event === 'PostToolBatch' &&
          event.hook_name === 'PostToolBatch' &&
          hookContext(event) === PER_BATCH_FEEDBACK_MESSAGE,
      ),
      'The PostToolBatch hook did not emit feedback after the Stripe MCP tool',
    );

    const completed = events.find((event) => event.type === 'result');
    assert.ok(completed, 'Claude session did not complete');
  });

  it('runs UserPromptSubmit and PostToolBatch without a Stop hook', () => {
    assert.ok(
      events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_started' &&
          event.hook_name === 'UserPromptSubmit',
      ),
      'The UserPromptSubmit hook did not run',
    );
    assert.ok(
      !events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_started' &&
          event.hook_name === 'Stop',
      ),
      'A Stop hook still ran',
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_started' &&
          event.hook_name === 'PostToolBatch',
      ),
      'The PostToolBatch hook did not run',
    );
    assert.ok(
      !events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_response' &&
          event.hook_event === 'UserPromptSubmit' &&
          hookContext(event) === PER_TURN_FEEDBACK_MESSAGE,
      ),
      'The first prompt received feedback without a previous turn',
    );

    const completed = events.find((event) => event.type === 'result');
    assert.ok(completed, 'Claude session did not complete');
  });

  it('keeps unsupported usage reporting silent', () => {
    assert.ok(!sessionStderr.includes('report_usage'));
    assert.ok(
      !events.some(
        (event) =>
          event.type === 'system' &&
          event.subtype === 'hook_response' &&
          event.hook_event === 'PostToolUse' &&
          hookOutput(event)?.systemMessage?.includes('report_usage'),
      ),
    );
  });
});

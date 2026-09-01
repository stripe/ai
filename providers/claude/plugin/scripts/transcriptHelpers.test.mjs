import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { stripeMentionedInLastTurn } from './feedback.mjs';
import { lastTurnMentioned } from './transcriptHelpers.mjs';

function writeTranscript(t, entries) {
  const directory = mkdtempSync(join(tmpdir(), 'stripe-transcript-'));
  const transcriptPath = join(directory, 'transcript.jsonl');
  writeFileSync(
    transcriptPath,
    `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
    'utf8',
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return transcriptPath;
}

function userPrompt(text, metadata = {}) {
  return {
    ...metadata,
    type: 'user',
    message: { role: 'user', content: text },
  };
}

function assistantContent(content, metadata = {}) {
  return {
    ...metadata,
    type: 'assistant',
    message: { role: 'assistant', content },
  };
}

test('ignores matches before the latest user turn', (t) => {
  const transcriptPath = writeTranscript(t, [
    userPrompt('Help me integrate Stripe'),
    assistantContent([{ type: 'text', text: 'Here is the integration.' }]),
    userPrompt('Now explain CSS grid'),
    assistantContent([{ type: 'text', text: 'Use display: grid.' }]),
  ]);

  assert.equal(
    lastTurnMentioned(/stripe/i, {
      transcript_path: transcriptPath,
      last_assistant_message: 'Use display: grid.',
    }),
    false,
  );
});

test('finds a pattern in tool inputs, tool results, and hook output', (t) => {
  const cases = [
    assistantContent([
      {
        type: 'tool_use',
        name: 'Write',
        input: {
          file_path: '/tmp/client.js',
          content: "import Stripe from 'stripe';",
        },
      },
    ]),
    {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            content: 'Installed stripe successfully',
          },
        ],
      },
    },
    {
      type: 'attachment',
      attachment: {
        type: 'hook_additional_context',
        content: ['Stripe feedback is available'],
      },
    },
  ];

  for (const entry of cases) {
    const transcriptPath = writeTranscript(t, [
      userPrompt('Complete the payment task'),
      entry,
      assistantContent([{ type: 'text', text: 'Done.' }]),
    ]);
    assert.equal(
      lastTurnMentioned(/stripe/i, {
        transcript_path: transcriptPath,
        last_assistant_message: 'Done.',
      }),
      true,
    );
  }
});

test('checks the final assistant message but ignores transcript metadata', (t) => {
  const transcriptPath = writeTranscript(t, [
    userPrompt('Complete the payment task', {
      cwd: '/Users/example/stripe/project',
      gitBranch: 'stripe-migration',
    }),
    assistantContent([{ type: 'text', text: 'Done.' }], {
      cwd: '/Users/example/stripe/project',
      gitBranch: 'stripe-migration',
    }),
  ]);

  assert.equal(
    lastTurnMentioned(/stripe/i, {
      transcript_path: transcriptPath,
      last_assistant_message: 'Done.',
    }),
    false,
  );
  assert.equal(
    lastTurnMentioned(/stripe/i, {
      transcript_path: transcriptPath,
      last_assistant_message: 'The Stripe client is ready.',
    }),
    true,
  );
});

test('accepts patterns unrelated to Stripe', (t) => {
  const transcriptPath = writeTranscript(t, [
    userPrompt('Help me configure Checkout'),
    assistantContent([{ type: 'text', text: 'Done.' }]),
  ]);

  assert.equal(
    lastTurnMentioned(/checkout/i, {
      transcript_path: transcriptPath,
      last_assistant_message: 'Done.',
    }),
    true,
  );
});

test('provides Stripe-specific feedback logic', (t) => {
  const transcriptPath = writeTranscript(t, [
    userPrompt('Help me configure Stripe'),
    assistantContent([{ type: 'text', text: 'Done.' }]),
  ]);

  assert.equal(
    stripeMentionedInLastTurn({
      transcript_path: transcriptPath,
      last_assistant_message: 'Done.',
    }),
    true,
  );
});

test('reads a latest-turn entry larger than one transcript chunk', (t) => {
  const transcriptPath = writeTranscript(t, [
    userPrompt('Update the client'),
    assistantContent([
      {
        type: 'tool_use',
        name: 'Write',
        input: {
          file_path: '/tmp/client.js',
          content: `import Stripe from 'stripe';\n${'// padding\n'.repeat(
            8_000,
          )}`,
        },
      },
    ]),
    assistantContent([{ type: 'text', text: 'Done.' }]),
  ]);

  assert.equal(
    lastTurnMentioned(/stripe/i, {
      transcript_path: transcriptPath,
      last_assistant_message: 'Done.',
    }),
    true,
  );
});

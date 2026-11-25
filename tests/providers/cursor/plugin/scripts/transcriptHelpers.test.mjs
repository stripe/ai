import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { lastAssistantTurnToolCalls } from '../../../../../providers/cursor/plugin/scripts/transcriptHelpers.mjs';

function writeTranscript(t, entries) {
  const directory = mkdtempSync(join(tmpdir(), 'stripe-cursor-transcript-'));
  const transcriptPath = join(directory, 'transcript.jsonl');
  writeFileSync(
    transcriptPath,
    `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
    'utf8',
  );
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return transcriptPath;
}

function userPrompt(text) {
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

function assistantContent(content) {
  return { role: 'assistant', message: { content } };
}

function toolUse(name, input) {
  return { type: 'tool_use', name, input };
}

const TURN_ENDED = { type: 'turn_ended', status: 'success' };

test('returns only the tool calls from before the last turn', (t) => {
  const earlierTurnCall = toolUse('Read', {
    path: '/skills/other-skill/SKILL.md',
  });
  const skillRead = toolUse('Read', {
    path: '/skills/stripe-docs/SKILL.md',
  });
  const docsSearch = toolUse('CallDynamicTool', {
    toolName: 'search_stripe_documentation',
    arguments: { query: 'Checkout' },
  });
  const transcriptPath = writeTranscript(t, [
    userPrompt('Use another skill.'),
    assistantContent([
      { type: 'text', text: 'Reading another skill.\n\n[REDACTED]' },
      earlierTurnCall,
    ]),
    TURN_ENDED,
    userPrompt('Use the stripe-docs skill and search Checkout.'),
    assistantContent([
      { type: 'text', text: 'Reading the skill.\n\n[REDACTED]' },
      skillRead,
    ]),
    assistantContent([docsSearch]),
    assistantContent([{ type: 'text', text: 'DONE' }]),
    TURN_ENDED,
  ]);

  assert.deepEqual(
    lastAssistantTurnToolCalls({ transcript_path: transcriptPath }),
    [docsSearch, skillRead],
  );
});

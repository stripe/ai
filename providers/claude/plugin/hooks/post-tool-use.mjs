#!/usr/bin/env node
// PostToolUse hook, filtered by the matcher to Stripe plugin MCP tools.
// Injects the feedback suggestion as additionalContext rather than blocking,
// so it steers without interrupting the tool-use loop.
//
// The prefix check below is defensive: the matcher in hooks.json is the real
// filter, but if that ever loosens we don't want to nag on unrelated tools.

import { POST_TOOL_NOTE, STRIPE_MCP_PREFIX, emit, readEvent, recordEvent, run } from './feedback-lib.mjs';

run(async () => {
  const event = await readEvent();
  const toolName = event.tool_name ?? '';
  const isStripeMcp = toolName.startsWith(STRIPE_MCP_PREFIX);

  recordEvent(event, { tool_name: toolName, is_stripe_mcp: isStripeMcp, suggested: isStripeMcp });

  if (!isStripeMcp) return;
  emit({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: POST_TOOL_NOTE,
    },
  });
});

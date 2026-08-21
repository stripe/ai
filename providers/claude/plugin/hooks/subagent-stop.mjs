#!/usr/bin/env node
// SubagentStop hook. Same permissive rule as the Stop hook, applied to the
// subagent's own transcript so a subagent that touched Stripe gets the nudge
// before it hands control back to the parent.

import { FEEDBACK_NOTE, emit, mentionsStripe, readEvent, recordEvent, run } from './feedback-lib.mjs';

run(async () => {
  const event = await readEvent();
  const eligible = mentionsStripe(event.transcript_path);
  const alreadyBlocked = event.stop_hook_active === true;

  recordEvent(event, {
    transcript_kind: 'subagent',
    agent_id: event.agent_id ?? null,
    agent_type: event.agent_type ?? null,
    eligible,
    stop_hook_active: alreadyBlocked,
    blocked: eligible && !alreadyBlocked,
  });

  if (!eligible || alreadyBlocked) return;
  emit({ decision: 'block', reason: FEEDBACK_NOTE });
});

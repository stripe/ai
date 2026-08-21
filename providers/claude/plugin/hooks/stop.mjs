#!/usr/bin/env node
// Stop hook. Blocks once per stop, when the session mentions Stripe at all,
// to ask the agent to decide whether it has feedback worth submitting.
// Never blocks twice for the same stop. Never calls `stripe feedback` itself.

import { FEEDBACK_NOTE, emit, mentionsStripe, readEvent, recordEvent, run } from './feedback-lib.mjs';

run(async () => {
  const event = await readEvent();
  const eligible = mentionsStripe(event.transcript_path);
  const alreadyBlocked = event.stop_hook_active === true;

  recordEvent(event, {
    transcript_kind: 'main',
    eligible,
    stop_hook_active: alreadyBlocked,
    blocked: eligible && !alreadyBlocked,
  });

  if (!eligible || alreadyBlocked) return;
  emit({ decision: 'block', reason: FEEDBACK_NOTE });
});

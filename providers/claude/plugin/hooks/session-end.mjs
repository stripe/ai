#!/usr/bin/env node
// SessionEnd hook. Observation only -- a session that has already ended can't
// be steered, so this exists purely to close out the journal for the run.

import { mentionsStripe, readEvent, recordEvent, run } from './feedback-lib.mjs';

run(async () => {
  const event = await readEvent();
  let eligible = null;
  try {
    eligible = mentionsStripe(event.transcript_path);
  } catch {
    // At SessionEnd the transcript may already be gone. Record null rather
    // than failing the hook -- there is nothing actionable left to steer.
    eligible = null;
  }
  recordEvent(event, { reason: event.reason ?? null, eligible });
});

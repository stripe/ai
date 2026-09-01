#!/usr/bin/env node

import { STOP_FEEDBACK_SAMPLE_RATE } from '../constants.mjs';
import {
  PER_TURN_FEEDBACK_MESSAGE,
  shouldEmitPerTurnFeedback,
} from '../feedback.mjs';
import {
  emitSoftContext,
  readHookEvent,
  runHook,
  sample,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  if (
    event.stop_hook_active === true ||
    !sample(STOP_FEEDBACK_SAMPLE_RATE)
  ) {
    return;
  }

  if (shouldEmitPerTurnFeedback(event)) {
    emitSoftContext('Stop', PER_TURN_FEEDBACK_MESSAGE);
  }
});

#!/usr/bin/env node

import { PER_TURN_FEEDBACK_SAMPLE_RATE } from '../constants.mjs';
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
    sample(PER_TURN_FEEDBACK_SAMPLE_RATE) &&
    shouldEmitPerTurnFeedback(event)
  ) {
    emitSoftContext('UserPromptSubmit', PER_TURN_FEEDBACK_MESSAGE);
  }
});

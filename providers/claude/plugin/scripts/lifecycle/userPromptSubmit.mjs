#!/usr/bin/env node

import { PER_TURN_FEEDBACK_MESSAGE } from '../feedback.mjs';
import { shouldSampleFeedback } from '../feedbackSampling.mjs';
import {
  emitSoftContext,
  isTelemetryDisabled,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  if (isTelemetryDisabled()) {
    return;
  }

  const event = await readHookEvent();
  if (shouldSampleFeedback('UserPromptSubmit', event)) {
    emitSoftContext('UserPromptSubmit', PER_TURN_FEEDBACK_MESSAGE);
  }
});

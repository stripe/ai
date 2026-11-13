#!/usr/bin/env node

import { TOOL_FAILURE_FEEDBACK_MESSAGE } from '../feedback.mjs';
import { shouldSampleFeedback } from '../feedbackSampling.mjs';
import {
  emitHardSteer,
  isTelemetryDisabled,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  if (isTelemetryDisabled()) {
    return;
  }

  const event = await readHookEvent();
  if (shouldSampleFeedback('PostToolUseFailure', event)) {
    emitHardSteer(TOOL_FAILURE_FEEDBACK_MESSAGE);
  }
});

#!/usr/bin/env node

import { PER_TOOL_FEEDBACK_SAMPLE_RATE } from '../constants.mjs';
import {
  batchIncludesFailedStripeTool,
  batchIncludesStripeTool,
  PER_BATCH_FEEDBACK_MESSAGE,
} from '../feedback.mjs';
import {
  emitSoftContext,
  isTelemetryDisabled,
  readHookEvent,
  runHook,
  sample,
} from '../hookHelpers.mjs';

await runHook(async () => {
  if (isTelemetryDisabled()) {
    return;
  }

  const event = await readHookEvent();
  if (
    batchIncludesStripeTool(event) &&
    !batchIncludesFailedStripeTool(event) &&
    sample(PER_TOOL_FEEDBACK_SAMPLE_RATE)
  ) {
    emitSoftContext('PostToolBatch', PER_BATCH_FEEDBACK_MESSAGE);
  }
});

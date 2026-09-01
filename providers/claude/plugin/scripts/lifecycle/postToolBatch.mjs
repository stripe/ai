#!/usr/bin/env node

import { PER_BATCH_FEEDBACK_SAMPLE_RATE } from '../constants.mjs';
import {
  PER_BATCH_FEEDBACK_MESSAGE,
  shouldEmitPerBatchFeedback,
} from '../feedback.mjs';
import {
  emitSoftContext,
  readHookEvent,
  runHook,
  sample,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  const toolCalls = Array.isArray(event.tool_calls)
    ? event.tool_calls
    : [];

  if (
    shouldEmitPerBatchFeedback(toolCalls) &&
    sample(PER_BATCH_FEEDBACK_SAMPLE_RATE)
  ) {
    emitSoftContext('PostToolBatch', PER_BATCH_FEEDBACK_MESSAGE);
  }
});

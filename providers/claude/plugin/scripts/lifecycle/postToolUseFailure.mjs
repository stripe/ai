#!/usr/bin/env node

import {
  isStripeToolCall,
  TOOL_FAILURE_FEEDBACK_MESSAGE,
} from '../feedback.mjs';
import {
  emitSoftContext,
  getHookArguments,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  if (isStripeToolCall(event, getHookArguments(event))) {
    emitSoftContext('PostToolUseFailure', TOOL_FAILURE_FEEDBACK_MESSAGE);
  }
});

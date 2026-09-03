#!/usr/bin/env node

import {
  isStripeToolCall,
  TOOL_FAILURE_FEEDBACK_MESSAGE,
} from '../feedback.mjs';
import {
  emitHardSteer,
  getHookArguments,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  if (isStripeToolCall(event, getHookArguments(event))) {
    emitHardSteer(TOOL_FAILURE_FEEDBACK_MESSAGE);
  }
});

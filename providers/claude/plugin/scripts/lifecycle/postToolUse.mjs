#!/usr/bin/env node

import { POST_TOOL_USE_FEEDBACK_SAMPLE_RATE } from '../constants.mjs';
import { printFeedback, stripeToolUsed } from '../feedback.mjs';
import {
  getHookArguments,
  readHookEvent,
  runHook,
  sample,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  const argumentsValue = getHookArguments(event);

  if (
    stripeToolUsed(event, argumentsValue) &&
    sample(POST_TOOL_USE_FEEDBACK_SAMPLE_RATE)
  ) {
    printFeedback('tool', 'PostToolUse');
  }
});

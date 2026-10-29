#!/usr/bin/env node

import {
  PER_SKILL_FEEDBACK_SAMPLE_RATES,
  PER_TOOL_FEEDBACK_SAMPLE_RATE,
} from '../constants.mjs';
import {
  batchIncludesFailedStripeTool,
  batchIncludesStripeTool,
  PER_BATCH_FEEDBACK_MESSAGE,
  stripeSkillNamesInBatch,
} from '../feedback.mjs';
import {
  emitSoftContext,
  readHookEvent,
  runHook,
  sample,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  // A batch uses the highest rate among the default and any per-skill
  // overrides for the Stripe skills it invoked.
  const sampleRate = Math.max(
    PER_TOOL_FEEDBACK_SAMPLE_RATE,
    ...stripeSkillNamesInBatch(event).map((name) =>
      Object.hasOwn(PER_SKILL_FEEDBACK_SAMPLE_RATES, name)
        ? PER_SKILL_FEEDBACK_SAMPLE_RATES[name]
        : 0,
    ),
  );
  if (
    batchIncludesStripeTool(event) &&
    !batchIncludesFailedStripeTool(event) &&
    sample(sampleRate)
  ) {
    emitSoftContext('PostToolBatch', PER_BATCH_FEEDBACK_MESSAGE);
  }
});

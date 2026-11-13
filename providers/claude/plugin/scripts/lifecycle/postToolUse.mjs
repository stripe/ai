#!/usr/bin/env node

import { reportSkillUsage } from '../cli.mjs';
import {
  AGENT_FEEDBACK_MESSAGE,
  getStripeSkillName,
} from '../feedback.mjs';
import { shouldSampleFeedback } from '../feedbackSampling.mjs';
import {
  emitSoftContext,
  getHookArguments,
  isTelemetryDisabled,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  if (isTelemetryDisabled()) {
    return;
  }

  const event = await readHookEvent();
  const argumentsValue = getHookArguments(event);
  const skillName = getStripeSkillName(
    event,
    argumentsValue,
  );

  if (skillName) {
    reportSkillUsage(skillName);
  }

  if (shouldSampleFeedback('PostToolUse', event)) {
    emitSoftContext('PostToolUse', AGENT_FEEDBACK_MESSAGE);
  }
});

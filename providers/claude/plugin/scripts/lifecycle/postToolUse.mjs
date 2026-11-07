#!/usr/bin/env node

import { reportSkillUsage } from '../cli.mjs';
import { PER_TOOL_FEEDBACK_SAMPLE_RATE } from '../constants.mjs';
import {
  AGENT_FEEDBACK_MESSAGE,
  completedAgentWorkMentionsStripe,
  getStripeSkillName,
} from '../feedback.mjs';
import {
  emitSoftContext,
  getHookArguments,
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
  const argumentsValue = getHookArguments(event);
  const skillName = getStripeSkillName(
    event,
    argumentsValue,
  );

  if (skillName) {
    reportSkillUsage(skillName);
  }

  if (
    completedAgentWorkMentionsStripe(event) &&
    sample(PER_TOOL_FEEDBACK_SAMPLE_RATE)
  ) {
    emitSoftContext('PostToolUse', AGENT_FEEDBACK_MESSAGE);
  }
});

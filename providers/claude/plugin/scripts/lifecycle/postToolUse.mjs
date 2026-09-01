#!/usr/bin/env node

import { reportSkillUsage } from '../cli.mjs';
import { getStripeSkillName } from '../feedback.mjs';
import {
  getHookArguments,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  const skillName = getStripeSkillName(
    event,
    getHookArguments(event),
  );

  if (skillName) {
    reportSkillUsage(skillName);
  }
});

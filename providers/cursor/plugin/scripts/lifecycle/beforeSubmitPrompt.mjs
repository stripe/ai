#!/usr/bin/env node

import { reportSkillUsageForToolCalls } from '../cli.mjs';
import { readHookEvent, runHook } from '../hookHelpers.mjs';
import { lastAssistantTurnToolCalls } from '../transcriptHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();

  const toolCalls = lastAssistantTurnToolCalls(event);
  reportSkillUsageForToolCalls(toolCalls);
});

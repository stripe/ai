#!/usr/bin/env node

import { USER_PROMPT_SUBMITTED } from '../constants.mjs';
import { handlePromptSubmitted, runLifecycleHook } from '../hookHandlers.mjs';

const provider = process.argv[2];

await runLifecycleHook({
  provider,
  eventType: USER_PROMPT_SUBMITTED,
  handler: handlePromptSubmitted,
});

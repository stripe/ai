#!/usr/bin/env node

import { TOOL_COMPLETED } from '../constants.mjs';
import { handleToolCompleted, runLifecycleHook } from '../hookHandlers.mjs';

const provider = process.argv[2];

await runLifecycleHook({
  provider,
  eventType: TOOL_COMPLETED,
  handler: handleToolCompleted,
});

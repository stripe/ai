#!/usr/bin/env node

import { TOOL_BATCH_COMPLETED } from '../constants.mjs';
import { handleToolBatchCompleted, runLifecycleHook } from '../hookHandlers.mjs';

const provider = process.argv[2];

await runLifecycleHook({
  provider,
  eventType: TOOL_BATCH_COMPLETED,
  handler: handleToolBatchCompleted,
});

#!/usr/bin/env node

import { TOOL_FAILED } from '../constants.mjs';
import { handleToolFailed, runLifecycleHook } from '../hookHandlers.mjs';

const provider = process.argv[2];

await runLifecycleHook({
  provider,
  eventType: TOOL_FAILED,
  handler: handleToolFailed,
});

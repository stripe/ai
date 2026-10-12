#!/usr/bin/env node

import { SESSION_START } from '../constants.mjs';
import { handleSessionStart, runLifecycleHook } from '../hookHandlers.mjs';

const provider = process.argv[2];

await runLifecycleHook({
  provider,
  eventType: SESSION_START,
  handler: handleSessionStart,
});

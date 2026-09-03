#!/usr/bin/env node

import { getStripeCliGuidance } from '../cli.mjs';
import {
  emitSoftContext,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const event = await readHookEvent();
  if (event.source !== 'startup') {
    return;
  }

  const message = getStripeCliGuidance();
  if (message) {
    emitSoftContext('SessionStart', message);
  }
});

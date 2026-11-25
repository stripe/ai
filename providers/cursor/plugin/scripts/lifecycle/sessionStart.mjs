#!/usr/bin/env node

import { getStripeCliGuidance } from '../cli.mjs';
import {
  emitSoftContext,
  readHookEvent,
  runHook,
} from '../hookHelpers.mjs';

await runHook(async () => {
  const message = getStripeCliGuidance();
  if (message) {
    emitSoftContext(message);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { runHook } from './hookHelpers.mjs';

test('runHook swallows callback failures without rejecting', async () => {
  await assert.doesNotReject(() =>
    runHook(async () => {
      throw new Error('transcript read failed');
    }),
  );
});

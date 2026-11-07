import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isTelemetryDisabled,
  runHook,
} from '../../../../../providers/claude/plugin/scripts/hookHelpers.mjs';

test('runHook swallows callback failures without rejecting', async () => {
  await assert.doesNotReject(() =>
    runHook(async () => {
      throw new Error('transcript read failed');
    }),
  );
});

test('isTelemetryDisabled recognizes DISABLE_TELEMETRY and DO_NOT_TRACK', () => {
  for (const value of ['1', 'true', 'True', 'TRUE']) {
    assert.equal(isTelemetryDisabled({ DISABLE_TELEMETRY: value }), true);
    assert.equal(isTelemetryDisabled({ DO_NOT_TRACK: value }), true);
  }
});

test('isTelemetryDisabled ignores unset, empty, or falsy values', () => {
  for (const env of [
    {},
    { DISABLE_TELEMETRY: '0' },
    { DISABLE_TELEMETRY: 'false' },
    { DISABLE_TELEMETRY: '' },
    { DO_NOT_TRACK: '0' },
    { DO_NOT_TRACK: 'false' },
  ]) {
    assert.equal(isTelemetryDisabled(env), false);
  }
});

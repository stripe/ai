import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cliLoggedIn,
  getStripeCliGuidance,
  reportSkillUsage,
} from '../../../../../providers/provider_hooks/cli.mjs';

function fakeWhoami(status, stdout) {
  return (command, args) => {
    assert.equal(command, 'stripe');
    assert.deepEqual(args, ['whoami', '--format', 'json']);
    return { status, stdout, stderr: '', error: null };
  };
}

test('cliLoggedIn treats authenticated true as logged in', () => {
  assert.equal(
    cliLoggedIn(
      fakeWhoami(
        0,
        JSON.stringify({
          authenticated: true,
          account_id: 'acct_123',
          test_mode_key: { available: true },
          live_mode_key: { available: false },
        }),
      ),
    ),
    true,
  );
});

test('cliLoggedIn ignores a successful exit when authenticated is false', () => {
  assert.equal(
    cliLoggedIn(fakeWhoami(0, JSON.stringify({ authenticated: false }))),
    false,
  );
});

test('cliLoggedIn treats missing or invalid whoami output as logged out', () => {
  assert.equal(cliLoggedIn(fakeWhoami(1, '')), false);
  assert.equal(cliLoggedIn(fakeWhoami(0, 'not json')), false);
});

test('guidance CLI checks opt out of telemetry without affecting usage reporting', () => {
  const calls = [];
  const run = (command, args, options) => {
    calls.push({ command, args, options });
    if (command === 'stripe' && args[0] === '--version') {
      return { status: 0, stdout: 'stripe version 1.0.0' };
    }
    if (command === 'stripe' && args[0] === 'whoami') {
      return { status: 0, stdout: '{"authenticated":true}' };
    }
    return { status: 0, stdout: '1.0.0' };
  };

  getStripeCliGuidance(run);
  reportSkillUsage('stripe-docs', run);

  assert.deepEqual(
    calls.map(({ command, args }) => [command, args[0]]),
    [
      ['stripe', '--version'],
      ['stripe', 'whoami'],
      ['npm', 'view'],
      ['stripe', 'agent'],
    ],
  );
  for (const call of calls.slice(0, 2)) {
    assert.equal(call.options.env.STRIPE_CLI_TELEMETRY_OPTOUT, '1');
    assert.equal(call.options.env.PATH, process.env.PATH);
  }
  assert.equal(calls[2].options.env, undefined);
  assert.equal(calls[3].options.env, undefined);
});

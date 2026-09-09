import assert from 'node:assert/strict';
import test from 'node:test';
import { cliLoggedIn } from './cli.mjs';

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

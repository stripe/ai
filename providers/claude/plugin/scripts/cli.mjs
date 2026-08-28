import { spawnSync } from 'node:child_process';
import { CLI_COMMAND_TIMEOUT_MS } from './constants.mjs';

export const CLI_NOT_INSTALLED_MESSAGE =
  'The Stripe CLI can improve Stripe integration guidance. It can be installed with `npm i -g @stripe/cli`; `stripe login` connects an existing account, and `stripe sandbox create` creates a quick sandbox.';

export const CLI_NOT_LOGGED_IN_MESSAGE =
  'The Stripe CLI can provide better Stripe integration guidance when connected. `stripe login` connects an existing account, and `stripe sandbox create` creates a quick sandbox.';

const commandOptions = {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: CLI_COMMAND_TIMEOUT_MS,
};

function hasAuthenticatedConfig(config) {
  const configuredValue =
    /^\s*(?:account_id|test_mode_api_key|live_mode_api_key)\s*=\s*(.*?)\s*$/gim;

  for (const match of config.matchAll(configuredValue)) {
    const value = match[1].replace(/^(['"])(.*)\1$/, '$2').trim();
    if (value) {
      return true;
    }
  }
  return false;
}

export function cliInstalled(run = spawnSync) {
  const result = run('stripe', ['--version'], commandOptions);
  return result.error?.code !== 'ENOENT';
}

export function cliLoggedIn(run = spawnSync) {
  const result = run('stripe', ['config', '--list'], commandOptions);
  return result.status === 0 && hasAuthenticatedConfig(result.stdout ?? '');
}

export function getStripeCliGuidance(run = spawnSync) {
  if (!cliInstalled(run)) {
    return CLI_NOT_INSTALLED_MESSAGE;
  }

  return cliLoggedIn(run) ? undefined : CLI_NOT_LOGGED_IN_MESSAGE;
}

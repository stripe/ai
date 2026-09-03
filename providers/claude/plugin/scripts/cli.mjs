import { spawnSync } from 'node:child_process';
import { CLI_COMMAND_TIMEOUT_MS } from './constants.mjs';

export const CLI_NOT_INSTALLED_MESSAGE =
  'The Stripe CLI can improve Stripe integration guidance. It can be installed with `npm i -g @stripe/cli`; `stripe login` connects an existing account, and `stripe sandbox create` creates a quick sandbox.';

export const CLI_NOT_LOGGED_IN_MESSAGE =
  'The Stripe CLI can provide better Stripe integration guidance when connected. `stripe login` connects an existing account, and `stripe sandbox create` creates a quick sandbox.';

export const CLI_OUTDATED_MESSAGE =
  'A newer Stripe CLI version is available. Updating with `npm i -g @stripe/cli@latest` can provide the latest Stripe integration guidance.';

const commandOptions = {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: CLI_COMMAND_TIMEOUT_MS,
};

const silentCommandOptions = {
  ...commandOptions,
  stdio: 'ignore',
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

function parseVersion(output) {
  return output.match(/\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/)?.[0];
}

function getInstalledCli(run) {
  const result = run('stripe', ['--version'], commandOptions);
  return {
    installed: result.error?.code !== 'ENOENT',
    version:
      result.status === 0 ? parseVersion(result.stdout ?? '') : undefined,
  };
}

function getLatestCliVersion(run) {
  const result = run(
    'npm',
    ['view', '@stripe/cli', 'version'],
    commandOptions,
  );
  return result.status === 0
    ? parseVersion(result.stdout ?? '')
    : undefined;
}

export function cliInstalled(run = spawnSync) {
  return getInstalledCli(run).installed;
}

export function cliLoggedIn(run = spawnSync) {
  const result = run('stripe', ['config', '--list'], commandOptions);
  return result.status === 0 && hasAuthenticatedConfig(result.stdout ?? '');
}

export function reportSkillUsage(skillName, run = spawnSync) {)
  const args = [
    'agent',
    'report_usage',
    '--type',
    'skill',
    '--name',
    skillName,
  ];

  if (process.env.STRIPE_API_KEY) {
    args.push('--api-key', process.env.STRIPE_API_KEY);
  }
  console.log(`DEBUG: stripe ${args.join(' ')}`);
  try {
    run('stripe', args, silentCommandOptions);
  } catch {
    // Usage reporting must never affect the agent's work.
  }
}

export function getStripeCliGuidance(run = spawnSync) {
  const installedCli = getInstalledCli(run);
  if (!installedCli.installed) {
    return CLI_NOT_INSTALLED_MESSAGE;
  }

  const messages = [];
  if (!cliLoggedIn(run)) {
    messages.push(CLI_NOT_LOGGED_IN_MESSAGE);
  }

  const latestVersion = getLatestCliVersion(run);
  if (
    installedCli.version &&
    latestVersion &&
    installedCli.version !== latestVersion
  ) {
    messages.push(CLI_OUTDATED_MESSAGE);
  }

  return messages.length > 0 ? messages.join(' ') : undefined;
}

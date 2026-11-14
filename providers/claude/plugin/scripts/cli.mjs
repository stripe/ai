import { spawnSync } from 'node:child_process';
import { CLI_COMMAND_TIMEOUT_MS } from './constants.mjs';

export const CLI_NOT_INSTALLED_MESSAGE =
  'The Stripe CLI can improve Stripe integration guidance. It can be installed with `npm i -g @stripe/cli`; `stripe login` connects an existing account, and `stripe sandbox create` creates a quick sandbox.';

export const CLI_NOT_LOGGED_IN_MESSAGE =
  'The Stripe CLI can provide better Stripe integration guidance when connected. `stripe login` connects an existing account, and `stripe sandbox create` creates a quick sandbox.';

export const CLI_OUTDATED_MESSAGE =
  'A newer Stripe CLI version is available. Updating with `npm i -g @stripe/cli@latest` can provide the latest Stripe integration guidance.';

const commandOptions = {
  cwd: new URL('../', import.meta.url),
  shell: false,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: CLI_COMMAND_TIMEOUT_MS,
};

// The child inherits process.env, so opt out by setting the variable only for
// the duration of the (synchronous) call, then restore it.
function runUntracked(run, command, args) {
  const previous = process.env.STRIPE_CLI_TELEMETRY_OPTOUT;
  process.env.STRIPE_CLI_TELEMETRY_OPTOUT = '1';
  try {
    return run(command, args, commandOptions);
  } finally {
    if (previous === undefined) {
      delete process.env.STRIPE_CLI_TELEMETRY_OPTOUT;
    } else {
      process.env.STRIPE_CLI_TELEMETRY_OPTOUT = previous;
    }
  }
}

const silentCommandOptions = {
  ...commandOptions,
  stdio: 'ignore',
};

function parseVersion(output) {
  return output.match(/\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/)?.[0];
}

function getInstalledCli(run) {
  const result = runUntracked(run, 'stripe', ['--version']);
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
  try {
    const result = runUntracked(run, 'stripe', [
      'whoami',
      '--format',
      'json',
    ]);
    const payload = JSON.parse(result.stdout ?? '');
    return payload.authenticated;
  } catch {
    return false;
  }
}

export function reportSkillUsage(skillName, run = spawnSync) {
  const args = [
    'agent',
    'report_usage',
    '--type',
    'skill',
    '--name',
    skillName,
  ];

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

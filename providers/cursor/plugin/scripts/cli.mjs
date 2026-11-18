import { spawn, spawnSync } from 'node:child_process';
import { CLI_COMMAND_TIMEOUT_MS } from './constants.mjs';
import { getStripeSkillName } from './feedback.mjs';

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

const untrackedCommandOptions = {
  ...commandOptions,
  env: { ...process.env, STRIPE_CLI_TELEMETRY_OPTOUT: '1' },
};

// Usage reporting runs in a detached child so the hook returns immediately
// and never blocks the user's prompt from being submitted.
const detachedCommandOptions = {
  detached: true,
  stdio: 'ignore',
};

function parseVersion(output) {
  return output.match(/\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/)?.[0];
}

function getInstalledCli(run) {
  const result = run('stripe', ['--version'], untrackedCommandOptions);
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

function reportSkillUsage(skillName, run = spawn) {
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
  try {
    const child = run('stripe', args, detachedCommandOptions);
    // Drop the handle so the hook process can exit before the child does.
    child?.unref?.();
    child?.on?.('error', () => {});
  } catch {
    // Usage reporting must never affect the agent's work.
  }
}

export function reportSkillUsageForToolCalls(toolCalls, run = spawn) {
  for (const toolCall of toolCalls) {
    const stripeSkillName = getStripeSkillName(
      toolCall?.name,
      toolCall?.input?.path,
    );
    if (stripeSkillName) {
      reportSkillUsage(stripeSkillName, run);
    }
  }
}

export function cliLoggedIn(run = spawnSync) {
  try {
    const result = run(
      'stripe',
      ['whoami', '--format', 'json'],
      untrackedCommandOptions,
    );
    const payload = JSON.parse(result.stdout ?? '');
    return payload.authenticated;
  } catch {
    return false;
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

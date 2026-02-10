import {yellow} from 'colors';

export type Options = {
  apiKey: string;
  stripeAccount?: string;
};

export const ACCEPTED_ARGS = ['api-key', 'stripe-account'];

export function parseArgs(args: string[]): Options {
  const options: Partial<Options> = {};

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');

      if (key === 'tools') {
        console.warn(
          yellow(
            'The --tools flag has been removed. ' +
              'Tool permissions are now controlled by your Restricted API Key (RAK). ' +
              'Create a RAK with the desired permissions at https://dashboard.stripe.com/apikeys'
          )
        );
      } else if (key === 'api-key') {
        options.apiKey = value;
      } else if (key === 'stripe-account') {
        options.stripeAccount = value;
      } else {
        throw new Error(
          `Invalid argument: ${key}. Accepted arguments are: ${ACCEPTED_ARGS.join(', ')}`
        );
      }
    }
  });

  // Check if API key is either provided in args or set in environment variables
  const apiKey = options.apiKey || process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      'Stripe API key not provided. Please either pass it as an argument --api-key=$KEY or set the STRIPE_SECRET_KEY environment variable.'
    );
  }
  options.apiKey = apiKey;

  return options as Options;
}

export function validateApiKey(apiKey: string): void {
  if (!apiKey.startsWith('sk_') && !apiKey.startsWith('rk_')) {
    throw new Error(
      'Invalid API key format. Expected sk_* (secret key) or rk_* (restricted key).'
    );
  }

  if (apiKey.startsWith('sk_')) {
    console.warn(
      yellow(
        '[DEPRECATION WARNING] Using sk_* keys with Stripe MCP is being deprecated.\n' +
          'Please switch to rk_* (restricted keys) for better security.\n' +
          'See: https://docs.stripe.com/keys#create-restricted-api-keys\n'
      )
    );
  }
}

export function validateStripeAccount(account: string): void {
  if (!account.startsWith('acct_')) {
    throw new Error('Stripe account must start with "acct_".');
  }
}

export function buildHeaders(
  options: Options,
  userAgent: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
    'User-Agent': userAgent,
  };

  if (options.stripeAccount) {
    headers['Stripe-Account'] = options.stripeAccount;
  }

  return headers;
}

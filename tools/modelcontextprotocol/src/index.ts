#!/usr/bin/env node

import {StripeAgentToolkit} from '@stripe/agent-toolkit/modelcontextprotocol';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {green, red, yellow} from 'colors';

type ToolkitConfig = {
  actions: {
    [product: string]: {[action: string]: boolean};
  };
  context?: {
    account?: string;
    mode: 'modelcontextprotocol';
  };
};

type Options = {
  tools?: string[];
  apiKey?: string;
  stripeAccount?: string;
};

const ACCEPTED_ARGS = ['api-key', 'tools', 'stripe-account'];
const ACCEPTED_TOOLS = [
  'coupons.create',
  'coupons.read',
  'customers.create',
  'customers.read',
  'products.create',
  'products.read',
  'prices.create',
  'prices.read',
  'paymentLinks.create',
  'invoices.create',
  'invoices.read',
  'invoices.update',
  'invoiceItems.create',
  'balance.read',
  'refunds.create',
  'paymentIntents.read',
  'subscriptions.read',
  'subscriptions.update',
  'disputes.read',
  'disputes.update',
  'documentation.read',
];

export function parseArgs(args: string[]): Options {
  const options: Options = {};

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');

      if (key == 'tools') {
        options.tools = value.split(',');
      } else if (key == 'api-key') {
        if (!value.startsWith('sk_') && !value.startsWith('rk_')) {
          throw new Error('API key must start with "sk_" or "rk_".');
        }
        options.apiKey = value;
      } else if (key == 'stripe-account') {
        // Validate api-key format
        if (!value.startsWith('acct_')) {
          throw new Error('Stripe account must start with "acct_".');
        }
        options.stripeAccount = value;
      } else {
        throw new Error(
          `Invalid argument: ${key}. Accepted arguments are: ${ACCEPTED_ARGS.join(
            ', '
          )}`
        );
      }
    }
  });

  // Check if required tools arguments is present
  if (!options.tools) {
    throw new Error('The --tools arguments must be provided.');
  }

  // Validate tools against accepted enum values
  options.tools.forEach((tool: string) => {
    if (tool == 'all') {
      return;
    }
    if (!ACCEPTED_TOOLS.includes(tool.trim())) {
      throw new Error(
        `Invalid tool: ${tool}. Accepted tools are: ${ACCEPTED_TOOLS.join(
          ', '
        )}`
      );
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

  return options;
}

function handleError(error: any) {
  console.error(red('\n🚨  Error initializing Stripe MCP server:\n'));
  console.error(yellow(`   ${error.message}\n`));
}

export async function main() {
  const options = parseArgs(process.argv.slice(2));

  // Create the StripeAgentToolkit instance
  const selectedTools = options.tools!;
  const configuration: ToolkitConfig = {actions: {}};

  if (selectedTools.includes('all')) {
    ACCEPTED_TOOLS.forEach((tool) => {
      const [product, action] = tool.split('.');
      configuration.actions[product] = {
        ...configuration.actions[product],
        [action]: true,
      };
    });
  } else {
    selectedTools.forEach((tool: any) => {
      const [product, action] = tool.split('.');
      configuration.actions[product] = {[action]: true};
    });
  }

  configuration.context = {
    mode: 'modelcontextprotocol',
  };

  // Append stripe account to configuration if provided
  if (options.stripeAccount) {
    configuration.context.account = options.stripeAccount;
  }

  const server = new StripeAgentToolkit({
    secretKey: options.apiKey!,
    configuration: configuration,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // We use console.error instead of console.log since console.log will output to stdio, which will confuse the MCP server
  console.error(green('✅ Stripe MCP Server running on stdio'));
}

if (require.main === module) {
  main().catch((error) => {
    handleError(error);
  });
}

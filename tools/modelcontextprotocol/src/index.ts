#!/usr/bin/env node

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {green, red} from 'colors';
import {
  parseArgs,
  validateApiKey,
  validateStripeAccount,
  buildHeaders,
} from './cli';

const MCP_SERVER_URL = 'https://mcp.stripe.com';
const VERSION = '0.3.1';
const USER_AGENT = `stripe-mcp-local/${VERSION}`;

function handleError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(red('\n🚨  Error initializing Stripe MCP server:\n'));
  console.error(`   ${message}\n`);
}

export async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // Validate inputs
  validateApiKey(options.apiKey);
  if (options.stripeAccount) {
    validateStripeAccount(options.stripeAccount);
  }

  const headers = buildHeaders(options, USER_AGENT);

  // Create stdio transport (listens for messages from Claude Desktop)
  const stdioTransport = new StdioServerTransport();

  // Create HTTP transport (connects to remote MCP server)
  const httpTransport = new StreamableHTTPClientTransport(
    new URL(MCP_SERVER_URL),
    {requestInit: {headers}}
  );

  // Wire up message forwarding: stdio -> HTTP
  stdioTransport.onmessage = async (message) => {
    try {
      await httpTransport.send(message);
    } catch (error) {
      console.error(red('Error forwarding message to server:'), error);
    }
  };

  // Wire up message forwarding: HTTP -> stdio
  httpTransport.onmessage = async (message) => {
    try {
      await stdioTransport.send(message);
    } catch (error) {
      console.error(red('Error forwarding message to client:'), error);
    }
  };

  // Handle transport errors
  stdioTransport.onerror = (error) => {
    console.error(red('Stdio transport error:'), error);
  };

  httpTransport.onerror = (error) => {
    console.error(red('HTTP transport error:'), error);
  };

  // Handle transport close - just close the other transport
  stdioTransport.onclose = () => {
    httpTransport.close();
  };

  httpTransport.onclose = () => {
    stdioTransport.close();
  };

  // Start both transports
  await httpTransport.start();
  await stdioTransport.start();

  // Log success to stderr (stdout is reserved for MCP messages)
  console.error(green('✅ Stripe MCP Server running on stdio'));
}

if (require.main === module) {
  main().catch((error) => {
    handleError(error);
    throw error;
  });
}

// Re-export for backwards compatibility with tests
export {parseArgs} from './cli';

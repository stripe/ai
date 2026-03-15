#!/usr/bin/env node

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {JSONRPCMessage} from '@modelcontextprotocol/sdk/types.js';
import {green, red} from 'colors';
import {
  parseArgs,
  validateApiKey,
  validateStripeAccount,
  buildHeaders,
} from './cli';

const MCP_SERVER_URL = 'https://mcp.stripe.com';
const VERSION = '0.3.1';
const BASE_USER_AGENT = `stripe-mcp-local/${VERSION}`;

function handleError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(red('\n🚨  Error initializing Stripe MCP server:\n'));
  console.error(`   ${message}\n`);
}

/**
 * Extract the client name from an MCP initialize request message.
 * Returns undefined if the message is not an initialize request or has no clientInfo.
 */
export function extractClientName(message: JSONRPCMessage): string | undefined {
  if (
    'method' in message &&
    message.method === 'initialize' &&
    'params' in message &&
    message.params != null &&
    typeof message.params === 'object' &&
    'clientInfo' in message.params &&
    message.params.clientInfo != null &&
    typeof message.params.clientInfo === 'object' &&
    'name' in message.params.clientInfo &&
    typeof message.params.clientInfo.name === 'string'
  ) {
    return message.params.clientInfo.name;
  }
  return undefined;
}

/**
 * Build the User-Agent string, appending the MCP client name if available.
 */
export function buildUserAgent(clientName?: string): string {
  if (clientName) {
    return `${BASE_USER_AGENT} (${clientName})`;
  }
  return BASE_USER_AGENT;
}

export async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // Validate inputs
  validateApiKey(options.apiKey);
  if (options.stripeAccount) {
    validateStripeAccount(options.stripeAccount);
  }

  // Create stdio transport (listens for messages from MCP clients)
  const stdioTransport = new StdioServerTransport();

  let httpTransport: StreamableHTTPClientTransport | null = null;

  function createHttpTransport(
    userAgent: string
  ): StreamableHTTPClientTransport {
    const headers = buildHeaders(options, userAgent);
    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL),
      {requestInit: {headers}}
    );

    // Wire up message forwarding: HTTP -> stdio
    transport.onmessage = async (message) => {
      try {
        await stdioTransport.send(message);
      } catch (error) {
        console.error(red('Error forwarding message to client:'), error);
      }
    };

    transport.onerror = (error) => {
      console.error(red('HTTP transport error:'), error);
    };

    transport.onclose = () => {
      stdioTransport.close();
    };

    return transport;
  }

  // Wire up message forwarding: stdio -> HTTP
  // The first message is inspected for clientInfo to build the User-Agent.
  let initialized = false;

  stdioTransport.onmessage = async (message) => {
    try {
      if (!initialized) {
        initialized = true;

        // Extract client name from the initialize request (if present)
        const clientName = extractClientName(message);
        const userAgent = buildUserAgent(clientName);

        // Create and start the HTTP transport with the enriched User-Agent
        httpTransport = createHttpTransport(userAgent);
        await httpTransport.start();
      }

      await httpTransport!.send(message);
    } catch (error) {
      console.error(red('Error forwarding message to server:'), error);
    }
  };

  // Handle transport errors
  stdioTransport.onerror = (error) => {
    console.error(red('Stdio transport error:'), error);
  };

  // Handle transport close
  stdioTransport.onclose = () => {
    httpTransport?.close();
  };

  // Start stdio transport (HTTP transport starts on first message)
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

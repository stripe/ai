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
import {extractClientName, buildUserAgent} from './userAgent';

const MCP_SERVER_URL = 'https://mcp.stripe.com';

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
  let initializeTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  function clearInitializeTimeout() {
    if (initializeTimeoutHandle !== null) {
      clearTimeout(initializeTimeoutHandle);
      initializeTimeoutHandle = null;
    }
  }

  // Wrap the HTTP transport so that any response from the server cancels the
  // initialize timeout (server is alive and responding normally).
  function createHttpTransportWithTimeout(
    userAgent: string
  ): StreamableHTTPClientTransport {
    const transport = createHttpTransport(userAgent);
    const upstream = transport.onmessage;
    transport.onmessage = async (message) => {
      clearInitializeTimeout();
      if (upstream) await upstream(message);
    };
    return transport;
  }

  stdioTransport.onmessage = async (message) => {
    try {
      if (!initialized) {
        initialized = true;

        // Extract client name from the initialize request (if present)
        const clientName = extractClientName(message);
        const userAgent = buildUserAgent(clientName);

        // Create and start the HTTP transport with the enriched User-Agent
        httpTransport = createHttpTransportWithTimeout(userAgent);
        await httpTransport.start();
      }

      await httpTransport!.send(message);

      // After forwarding an initialize request, arm a timeout so the client
      // gets a fast error if the server hangs (e.g. unsupported protocol
      // version) instead of waiting 60 s for its own timeout to fire.
      const msg = message as Record<string, unknown>;
      if (msg.method === 'initialize' && initializeTimeoutHandle === null) {
        const msgId = msg.id ?? null;
        initializeTimeoutHandle = setTimeout(() => {
          initializeTimeoutHandle = null;
          console.error(
            red(
              '\n⏱  Initialize timed out — the remote MCP server did not respond.\n' +
                '   This often happens when the client sends a protocol version the server\n' +
                '   does not support (e.g. "2025-11-25"). Try protocol version "2024-11-05".\n'
            )
          );
          // Send a JSON-RPC error back so the client fails fast.
          stdioTransport
            .send({
              jsonrpc: '2.0',
              id: msgId,
              error: {
                code: -32001,
                message:
                  'MCP server did not respond to initialize request. ' +
                  'The server may not support the requested protocol version. ' +
                  'Try protocol version "2024-11-05".',
              },
            } as Parameters<typeof stdioTransport.send>[0])
            .catch(() => {});
          httpTransport?.close();
        }, 10_000);
      }
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
    clearInitializeTimeout();
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

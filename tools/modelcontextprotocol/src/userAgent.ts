const VERSION = '0.3.1';
const BASE_USER_AGENT = `stripe-mcp-local/${VERSION}`;

/**
 * Extract the client name from an MCP initialize request message.
 * Returns undefined if the message is not an initialize request or has no clientInfo.
 */
export function extractClientName(message: {
  method?: string;
  params?: unknown;
  [key: string]: unknown;
}): string | undefined {
  if (
    message.method === 'initialize' &&
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

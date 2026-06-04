const VERSION = process.env.PACKAGE_VERSION || '0.0.0-development';
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

const MAX_CLIENT_NAME_LENGTH = 128;
const CLIENT_NAME_ALLOWED = /[^a-zA-Z0-9 ._/-]/g;

/**
 * Build the User-Agent string, appending the MCP client name if available.
 */
function sanitizeClientName(clientName: string): string | undefined {
  const sanitized = clientName
    .replace(/[\r\n]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(CLIENT_NAME_ALLOWED, '')
    .trim()
    .slice(0, MAX_CLIENT_NAME_LENGTH);

  if (!sanitized) {
    return undefined;
  }

  return sanitized;
}

export function buildUserAgent(clientName?: string): string {
  if (clientName) {
    const sanitizedClientName = sanitizeClientName(clientName);
    if (sanitizedClientName) {
      return `${BASE_USER_AGENT} (${sanitizedClientName})`;
    }
  }
  return BASE_USER_AGENT;
}

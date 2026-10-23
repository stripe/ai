import {
  ErrorCode,
  isJSONRPCRequest,
  type JSONRPCError,
  type JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Builds the JSON-RPC error response to send back to the client when a
 * message could not be forwarded to the Stripe MCP server.
 *
 * Only requests get a response. Notifications and responses from the client
 * must not be answered, so this returns undefined for them.
 */
export function buildForwardingErrorResponse(
  message: JSONRPCMessage,
  error: unknown
): JSONRPCError | undefined {
  if (!isJSONRPCRequest(message)) {
    return undefined;
  }

  const detail = error instanceof Error ? error.message : String(error);

  return {
    jsonrpc: '2.0',
    id: message.id,
    error: {
      code: ErrorCode.InternalError,
      message: `Error forwarding request to the Stripe MCP server: ${detail}`,
    },
  };
}

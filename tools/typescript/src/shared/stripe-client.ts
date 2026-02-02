import type {Context} from './configuration';
import {StripeMcpClient, McpTool} from './mcp-client';
import {AsyncInitializer} from './async-initializer';

/**
 * Unified client for Stripe operations via MCP.
 *
 * All tool operations are executed via MCP (mcp.stripe.com).
 *
 * @example
 * const client = new StripeClient('rk_test_...', context);
 * await client.initialize();
 * const tools = client.getRemoteTools();
 * const result = await client.run('create_customer', { email: 'test@example.com' });
 * await client.close();
 */
class StripeClient {
  context: Context;

  private mcpClient: StripeMcpClient;
  private initializer = new AsyncInitializer();

  constructor(secretKey: string, context?: Context) {
    this.context = context || {};

    // MCP client for all tool operations
    this.mcpClient = new StripeMcpClient({
      secretKey,
      context: {
        account: context?.account,
        customer: context?.customer,
      },
      mode: context?.mode,
    });
  }

  /**
   * Async initialization - connects to MCP server.
   * Must be called before using tools via run().
   */
  initialize(): Promise<void> {
    return this.initializer.initialize(() => this.mcpClient.connect());
  }

  /**
   * Check if the client has been initialized.
   */
  isInitialized(): boolean {
    return this.initializer.isInitialized;
  }

  /**
   * Get tools from MCP server (after initialization).
   * Returns tool definitions with JSON Schema input schemas.
   */
  getRemoteTools(): McpTool[] {
    if (!this.initializer.isInitialized) {
      throw new Error(
        'StripeClient not initialized. Call initialize() before accessing tools.'
      );
    }
    return this.mcpClient.getTools();
  }

  /**
   * Execute a tool via MCP.
   * @param method - The tool method name (e.g., 'create_customer')
   * @param arg - The tool arguments
   * @param options - Optional per-call overrides (e.g., customer)
   * @returns JSON string result
   */
  run(
    method: string,
    arg: Record<string, unknown>,
    options?: {customer?: string}
  ): Promise<string> {
    if (!this.initializer.isInitialized) {
      throw new Error(
        'StripeClient not initialized. Call initialize() before running tools.'
      );
    }

    return this.mcpClient.callTool(method, arg, options);
  }

  /**
   * Close the MCP connection and clean up resources.
   * Safe to call multiple times (idempotent).
   */
  async close(): Promise<void> {
    if (!this.initializer.isInitialized) {
      return; // Already closed or never initialized
    }

    await this.mcpClient.disconnect();
    this.initializer.reset();
  }
}

export default StripeClient;

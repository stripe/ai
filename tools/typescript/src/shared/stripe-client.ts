import Stripe from 'stripe';

import type {Context} from './configuration';
import {StripeMcpClient, McpTool} from './mcp-client';
import {AsyncInitializer} from './async-initializer';
import {VERSION, TOOLKIT_HEADER, MCP_HEADER} from './constants';

export interface StripeClientOptions {
  /** Optional timeout in milliseconds for MCP connection. No timeout by default. */
  timeout?: number;
}

/**
 * Unified client for Stripe operations.
 *
 * - Tool execution: All tools are executed via MCP (mcp.stripe.com)
 * - Billing: Uses direct Stripe SDK for meter events (middleware billing)
 *
 * @example
 * const client = new StripeClient('rk_test_...', context, { timeout: 30000 });
 * await client.initialize();
 * const tools = client.getRemoteTools();
 * const result = await client.run('create_customer', { email: 'test@example.com' });
 * await client.close();
 */
class StripeClient {
  /**
   * Direct Stripe SDK instance.
   * Used ONLY for billing middleware (createMeterEvent).
   * All tool operations go through MCP.
   */
  stripe: Stripe;

  context: Context;

  private mcpClient: StripeMcpClient;
  private initializer = new AsyncInitializer();

  constructor(
    secretKey: string,
    context?: Context,
    options?: StripeClientOptions
  ) {
    // Stripe SDK only used for createMeterEvent (billing middleware)
    const stripeClient = new Stripe(secretKey, {
      appInfo: {
        name:
          context?.mode === 'modelcontextprotocol'
            ? MCP_HEADER
            : TOOLKIT_HEADER,
        version: VERSION,
        url: 'https://github.com/stripe/ai',
      },
    });
    this.stripe = stripeClient;
    this.context = context || {};

    // MCP client for all tool operations
    this.mcpClient = new StripeMcpClient({
      secretKey,
      context: {
        account: context?.account,
        customer: context?.customer,
      },
      mode: context?.mode,
      timeout: options?.timeout,
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
   * Create a billing meter event.
   * Uses direct Stripe SDK (not MCP) for billing middleware.
   */
  async createMeterEvent({
    event,
    customer,
    value,
  }: {
    event: string;
    customer: string;
    value: string;
  }) {
    await this.stripe.billing.meterEvents.create(
      {
        event_name: event,
        payload: {
          stripe_customer_id: customer,
          value: value,
        },
      },
      this.context.account ? {stripeAccount: this.context.account} : undefined
    );
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

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {RequestHandlerExtra} from '@modelcontextprotocol/sdk/shared/protocol.js';
import {Configuration, isToolAllowedByName} from '../shared/configuration';
import {StripeMcpClient, McpTool} from '../shared/mcp-client';
import {jsonSchemaToZodShape} from '../shared/schema-utils';
import {AsyncInitializer} from '../shared/async-initializer';
import {VERSION} from '../shared/constants';
import Stripe from 'stripe';

export interface McpToolkitConfig {
  secretKey: string;
  configuration: Configuration;
  /** Optional timeout in milliseconds for MCP connection. No timeout by default. */
  timeout?: number;
}

class StripeAgentToolkit extends McpServer {
  private _mcpClient: StripeMcpClient;
  private _stripe: Stripe;
  private _configuration: Configuration;
  private _initializer = new AsyncInitializer();

  constructor({secretKey, configuration, timeout}: McpToolkitConfig) {
    super({
      name: 'Stripe',
      version: VERSION,
    });

    this._configuration = configuration;

    // MCP client for connecting to mcp.stripe.com
    this._mcpClient = new StripeMcpClient({
      secretKey,
      context: {
        account: configuration.context?.account,
        customer: configuration.context?.customer,
      },
      mode: configuration.context?.mode,
      timeout,
    });

    // Keep Stripe SDK for registerPaidTool billing operations
    this._stripe = new Stripe(secretKey, {
      appInfo: {
        name: 'stripe-mcp',
        version: VERSION,
        url: 'https://github.com/stripe/ai',
      },
    });
  }

  /**
   * Initialize the toolkit by connecting to mcp.stripe.com and registering tools.
   * Must be called after construction and before the server starts handling requests.
   */
  initialize(): Promise<void> {
    return this._initializer.initialize(() => this.doInitialize());
  }

  private async doInitialize(): Promise<void> {
    await this._mcpClient.connect();

    // Get tools from remote MCP and register as local proxies
    const remoteTools = this._mcpClient.getTools();
    const filteredTools = remoteTools.filter((t) =>
      isToolAllowedByName(t.name, this._configuration)
    );

    for (const remoteTool of filteredTools) {
      this.registerProxyTool(remoteTool);
    }
  }

  /**
   * Register a tool that proxies execution to mcp.stripe.com
   */
  private registerProxyTool(remoteTool: McpTool): void {
    // Convert JSON Schema to Zod shape for MCP SDK tool registration
    // This properly handles the 'required' field and type validation
    const zodShape = jsonSchemaToZodShape(remoteTool.inputSchema);

    this.tool(
      remoteTool.name,
      remoteTool.description || remoteTool.name,
      zodShape,
      async (
        args: Record<string, unknown>,
        _extra: RequestHandlerExtra<any, any>
      ) => {
        try {
          // If args.customer exists, pass it as override to callTool
          // callTool will handle fallback to connection-time customer
          const options = args.customer
            ? {customer: args.customer as string}
            : undefined;

          const result = await this._mcpClient.callTool(
            remoteTool.name,
            args,
            options
          );
          return {
            content: [
              {
                type: 'text' as const,
                text: result,
              },
            ],
          };
        } catch (error) {
          // Re-throw for proper MCP error propagation
          // MCP protocol expects errors to propagate as exceptions, not as successful responses with isError: true
          if (error instanceof Error) {
            throw error;
          }
          throw new Error(String(error));
        }
      }
    );
  }

  /**
   * Check if the toolkit has been initialized.
   */
  isInitialized(): boolean {
    return this._initializer.isInitialized;
  }

  /**
   * Get the Stripe SDK instance for registerPaidTool billing operations.
   * Note: This is only for billing operations, not for tool execution.
   */
  getStripeClient(): Stripe {
    return this._stripe;
  }

  /**
   * Close the MCP client connection and clean up resources.
   * Safe to call multiple times (idempotent).
   */
  async close(): Promise<void> {
    if (!this._initializer.isInitialized) {
      return; // Already closed or never initialized
    }

    await this._mcpClient.disconnect();
    this._initializer.reset();
  }
}

/**
 * Factory function to create and initialize a StripeAgentToolkit.
 * Provides a simpler async initialization pattern.
 *
 * @example
 * const toolkit = await createStripeAgentToolkit({
 *   secretKey: 'rk_test_...',
 *   configuration: { actions: { customers: { create: true } } }
 * });
 * // toolkit is now ready to use as an MCP server
 */
export async function createStripeAgentToolkit(
  config: McpToolkitConfig
): Promise<StripeAgentToolkit> {
  const toolkit = new StripeAgentToolkit(config);
  await toolkit.initialize();
  return toolkit;
}

export default StripeAgentToolkit;

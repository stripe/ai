import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {AsyncInitializer} from './async-initializer';
import {VERSION, MCP_SERVER_URL, TOOLKIT_HEADER, MCP_HEADER} from './constants';

export interface McpClientConfig {
  secretKey: string;
  context?: {
    account?: string;
    customer?: string;
  };
  mode?: 'modelcontextprotocol' | 'toolkit';
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolCallResult {
  content: Array<{type: string; text?: string}>;
  isError?: boolean;
}

export class StripeMcpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: McpTool[] = [];
  private config: McpClientConfig;
  private initializer = new AsyncInitializer();

  constructor(config: McpClientConfig) {
    this.config = config;
    this.validateKey(config.secretKey);
  }

  /**
   * Create transport and client fresh for each connection attempt.
   */
  private createTransportAndClient(): {
    transport: StreamableHTTPClientTransport;
    client: Client;
  } {
    // Determine User-Agent based on mode
    const userAgent =
      this.config.mode === 'modelcontextprotocol'
        ? `${MCP_HEADER}/${VERSION}`
        : `${TOOLKIT_HEADER}/${VERSION}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.secretKey}`,
      'User-Agent': userAgent,
    };

    if (this.config.context?.account) {
      headers['Stripe-Account'] = this.config.context.account;
    }

    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL),
      {requestInit: {headers}}
    );

    const client = new Client(
      {
        name: TOOLKIT_HEADER,
        version: VERSION,
      },
      {
        capabilities: {},
      }
    );

    return {transport, client};
  }

  private validateKey(key: string): void {
    if (!key) {
      throw new Error('API key is required.');
    }

    if (!key.startsWith('sk_') && !key.startsWith('rk_')) {
      throw new Error(
        'Invalid API key format. Expected sk_* (secret key) or rk_* (restricted key).'
      );
    }

    if (key.startsWith('sk_')) {
      console.warn(
        '[DEPRECATION WARNING] Using sk_* keys with Stripe MCP is being deprecated. ' +
          'Please switch to rk_* (restricted keys) for better security. ' +
          'See: https://docs.stripe.com/keys#create-restricted-api-keys'
      );
    }
  }

  connect(): Promise<void> {
    return this.initializer.initialize(() => this.doConnect());
  }

  private async doConnect(): Promise<void> {
    try {
      // Create transport and client fresh for each connection attempt
      const {transport, client} = this.createTransportAndClient();
      this.transport = transport;
      this.client = client;

      await this.client.connect(this.transport);
      const result = await this.client.listTools();
      this.tools = result.tools as McpTool[];
    } catch (error) {
      // Clean up on failure
      this.client = null;
      this.transport = null;

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to connect to Stripe MCP server at ${MCP_SERVER_URL}. ` +
          `No fallback to direct SDK is available. ` +
          `Error: ${errorMessage}`,
        {cause: error}
      );
    }
  }

  isConnected(): boolean {
    return this.initializer.isInitialized;
  }

  getTools(): McpTool[] {
    if (!this.initializer.isInitialized) {
      throw new Error(
        'MCP client not connected. Call connect() before accessing tools.'
      );
    }
    return this.tools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    options?: {customer?: string}
  ): Promise<string> {
    if (!this.initializer.isInitialized || !this.client) {
      throw new Error(
        'MCP client not connected. Call connect() before calling tools.'
      );
    }

    // Customer priority: per-call override > connection-time context > none
    const customer = options?.customer ?? this.config.context?.customer;

    // Validate for conflicts - warn if args.customer exists and differs from override
    if (customer && args.customer && args.customer !== customer) {
      console.warn(
        `[Stripe Agent Toolkit] Customer context conflict detected:\n` +
          `  - Tool args.customer: ${args.customer}\n` +
          `  - Override customer: ${customer}\n` +
          `  Using override customer. This may indicate a bug in your code.`
      );
    }

    // Inject customer into args if present
    const finalArgs = customer ? {...args, customer} : args;

    try {
      const result = (await this.client.callTool({
        name,
        arguments: finalArgs,
      })) as McpToolCallResult;

      if (result.isError) {
        const errorText = result.content?.find((c) => c.type === 'text')?.text;
        throw new Error(errorText || 'Tool execution failed');
      }

      const textContent = result.content?.find((c) => c.type === 'text');
      if (textContent && textContent.text) {
        return textContent.text;
      }

      return JSON.stringify(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute tool '${name}': ${errorMessage}`, {
        cause: error,
      });
    }
  }

  /**
   * Disconnect from the MCP server and clean up resources.
   * Safe to call multiple times (idempotent).
   */
  async disconnect(): Promise<void> {
    if (!this.initializer.isInitialized) {
      return; // Already disconnected or never connected
    }

    try {
      if (this.client) {
        await this.client.close();
      }
    } finally {
      // Always clean up state, even if close() throws
      this.client = null;
      this.transport = null;
      this.tools = [];
      this.initializer.reset();
    }
  }
}

export default StripeMcpClient;

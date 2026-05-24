import {StripeMcpClient, type McpTool} from './mcp-client';
import {MultiMcpClient} from './multi-mcp-client';
import {AsyncInitializer} from './async-initializer';
import {type Configuration} from './configuration';

export type {McpTool};

/**
 * Configuration options for toolkit initialization.
 */
export interface ToolkitConfig {
  secretKey: string;
  configuration: Configuration;
}

/**
 * Base class for all Stripe Agent Toolkit implementations.
 * Subclasses override convertTools() to transform MCP tools into framework-specific formats.
 *
 * Supports additional MCP servers whose tools are merged with the core Stripe
 * tools. When a tool call is invoked, it is automatically routed to the
 * server that provides it.
 *
 * @template T - The type of tools returned by this toolkit (e.g., ChatCompletionTool[], StripeTool[])
 */
export class ToolkitCore<T = McpTool[]> {
  /**
   * The MCP client that handles connections to mcp.stripe.com and tool execution.
   */
  readonly mcpClient: StripeMcpClient;

  /**
   * Optional client for additional MCP servers (e.g. batch payment providers).
   */
  private additionalClient: MultiMcpClient | null = null;

  readonly configuration: Configuration;
  private _initializer = new AsyncInitializer();
  private _tools: T;

  constructor(config: ToolkitConfig, emptyTools: T) {
    this.mcpClient = new StripeMcpClient({
      secretKey: config.secretKey,
      context: {
        account: config.configuration.context?.account,
        customer: config.configuration.context?.customer,
      },
      mode: config.configuration.context?.mode,
    });
    this.configuration = config.configuration;
    this._tools = emptyTools;

    if (
      config.configuration.additionalMcpServers &&
      config.configuration.additionalMcpServers.length > 0
    ) {
      this.additionalClient = new MultiMcpClient();
    }
  }

  /**
   * Convert MCP tools to framework-specific format.
   * Override this method in subclasses to provide custom conversion.
   * Default implementation returns tools as-is (cast to T).
   */
  protected convertTools(mcpTools: McpTool[]): T {
    return mcpTools as unknown as T;
  }

  /**
   * Initialize the toolkit by connecting to the MCP server and fetching tools.
   * The server filters tools based on RAK permissions.
   *
   * If additional MCP servers are configured, their tools are fetched and
   * merged with the core Stripe tools.
   */
  async initialize(): Promise<void> {
    await this._initializer.initialize(async () => {
      await this.mcpClient.connect();

      const remoteTools = this.mcpClient.getTools();
      let allTools = [...remoteTools];

      // Connect additional MCP servers and merge their tools.
      // Stripe tool names are reserved — additional servers cannot shadow them.
      if (
        this.additionalClient &&
        this.configuration.additionalMcpServers
      ) {
        const stripeToolNames = remoteTools.map((t) => t.name);
        this.additionalClient.setReservedNames(stripeToolNames);

        await this.additionalClient.connect(
          this.configuration.additionalMcpServers
        );
        const additionalTools = this.additionalClient.getTools();
        allTools = [...allTools, ...additionalTools];
      }

      this._tools = this.convertTools(allTools);
    });
  }

  /**
   * Check if the toolkit has been initialized.
   */
  isInitialized(): boolean {
    return this._initializer.isInitialized;
  }

  /**
   * Get tools, throwing if not initialized.
   */
  getTools(): T {
    this.ensureInitialized();
    return this._tools;
  }

  /**
   * Get tools with a warning if not initialized.
   * @deprecated Use getTools() after calling initialize().
   */
  getToolsWithWarning(): T {
    this.warnIfNotInitialized();
    return this._tools;
  }

  /**
   * Route a tool call to the correct MCP server and return the result.
   * Core Stripe tools always take priority. Additional server tools are
   * only called for names that do not exist in the Stripe tool set.
   */
  async routeToolCall(
    name: string,
    args: Record<string, unknown>,
    options?: {customer?: string}
  ): Promise<string> {
    this.ensureInitialized();

    // Additional servers only handle tools that Stripe does not own.
    // The collision guard in MultiMcpClient already prevents shadowing,
    // but this ordering provides defense-in-depth.
    if (this.additionalClient && this.additionalClient.hasTool(name)) {
      return this.additionalClient.callTool(name, args);
    }

    // Default: route to the primary Stripe MCP server
    return this.mcpClient.callTool(name, args, options);
  }

  /**
   * Close the MCP connection and clean up resources.
   */
  async close(emptyTools: T): Promise<void> {
    if (!this._initializer.isInitialized) {
      return;
    }

    await this.mcpClient.disconnect();

    if (this.additionalClient) {
      await this.additionalClient.disconnect();
    }

    this._initializer.reset();
    this._tools = emptyTools;
  }

  /**
   * Throw an error if not initialized.
   */
  ensureInitialized(): void {
    if (!this._initializer.isInitialized) {
      throw new Error(
        'StripeAgentToolkit not initialized. ' +
          'Use `await createStripeAgentToolkit()` factory (recommended) or call `await toolkit.initialize()` first. ' +
          'See migration guide: https://github.com/stripe/agent-toolkit/blob/main/tools/typescript/MIGRATION.md'
      );
    }
  }

  /**
   * Warn if accessing tools before initialization.
   */
  warnIfNotInitialized(): void {
    if (!this._initializer.isInitialized) {
      console.warn(
        '[StripeAgentToolkit] Accessing tools before initialization. ' +
          'Use createStripeAgentToolkit() factory (recommended) or call await toolkit.initialize() first. ' +
          'Tools will be empty until initialized.'
      );
    }
  }
}

export default ToolkitCore;

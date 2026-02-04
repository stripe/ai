import {StripeMcpClient, type McpTool} from './mcp-client';
import {AsyncInitializer} from './async-initializer';
import {isToolAllowedByName, type Configuration} from './configuration';

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
 * @template T - The type of tools returned by this toolkit (e.g., ChatCompletionTool[], StripeTool[])
 */
export class ToolkitCore<T = McpTool[]> {
  /**
   * The MCP client that handles connections to mcp.stripe.com and tool execution.
   */
  readonly mcpClient: StripeMcpClient;
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
   */
  async initialize(): Promise<void> {
    await this._initializer.initialize(async () => {
      await this.mcpClient.connect();

      const remoteTools = this.mcpClient.getTools();
      const filteredTools = remoteTools.filter((t) =>
        isToolAllowedByName(t.name, this.configuration)
      );

      this._tools = this.convertTools(filteredTools);
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
   * Close the MCP connection and clean up resources.
   */
  async close(emptyTools: T): Promise<void> {
    if (!this._initializer.isInitialized) {
      return;
    }

    await this.mcpClient.disconnect();
    this._initializer.reset();
    this._tools = emptyTools;
  }

  /**
   * Throw an error if not initialized.
   */
  ensureInitialized(): void {
    if (!this._initializer.isInitialized) {
      throw new Error(
        'StripeAgentToolkit not initialized. Call await toolkit.initialize() first.'
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

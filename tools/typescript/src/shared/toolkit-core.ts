import StripeClient from './stripe-client';
import {AsyncInitializer} from './async-initializer';
import {isToolAllowedByName, type Configuration} from './configuration';
import type {McpTool} from './mcp-client';

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
  readonly stripe: StripeClient;
  readonly configuration: Configuration;
  private _initializer = new AsyncInitializer();
  private _tools: T;

  constructor(config: ToolkitConfig, emptyTools: T) {
    this.stripe = new StripeClient(
      config.secretKey,
      config.configuration.context
    );
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
      await this.stripe.initialize();

      const remoteTools = this.stripe.getRemoteTools();
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

    await this.stripe.close();
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
          'Call await toolkit.initialize() first, or use createStripeAgentToolkit() factory. ' +
          'Tools will be empty until initialized.'
      );
    }
  }
}

export default ToolkitCore;

import StripeAPI from './api';
import {AsyncInitializer} from './async-initializer';
import {isToolAllowedByName, type Configuration} from './configuration';
import type {McpTool} from './mcp-client';

/**
 * Configuration options for toolkit initialization.
 */
export interface ToolkitConfig {
  secretKey: string;
  configuration: Configuration;
  /** Optional timeout in milliseconds for MCP connection. No timeout by default. */
  timeout?: number;
}

/**
 * Shared core functionality for all Stripe Agent Toolkit implementations.
 * Uses composition to avoid inheritance issues with framework-specific interfaces.
 *
 * Each toolkit (AI SDK, LangChain, OpenAI) creates an instance of this class
 * and delegates common operations to it.
 */
export class ToolkitCore {
  readonly stripe: StripeAPI;
  readonly configuration: Configuration;
  readonly initializer = new AsyncInitializer();

  constructor(config: ToolkitConfig) {
    this.stripe = new StripeAPI(
      config.secretKey,
      config.configuration.context,
      {
        timeout: config.timeout,
      }
    );
    this.configuration = config.configuration;
  }

  /**
   * Initialize the toolkit by connecting to the MCP server.
   * @param onInitialized - Callback to convert remote tools to framework-specific format
   */
  initialize(onInitialized: (tools: McpTool[]) => void): Promise<void> {
    return this.initializer.initialize(async () => {
      await this.stripe.initialize();

      // Get tools from MCP and filter by configuration
      const remoteTools = this.stripe.getRemoteTools();
      const filteredTools = remoteTools.filter((t) =>
        isToolAllowedByName(t.name, this.configuration)
      );

      onInitialized(filteredTools);
    });
  }

  /**
   * Check if the toolkit has been initialized.
   */
  isInitialized(): boolean {
    return this.initializer.isInitialized;
  }

  /**
   * Close the MCP connection and clean up resources.
   * @param onClose - Callback to clear framework-specific tool state
   */
  close(onClose: () => void): Promise<void> {
    if (!this.initializer.isInitialized) {
      return Promise.resolve(); // Already closed or never initialized
    }

    return this.stripe.close().then(() => {
      this.initializer.reset();
      onClose();
    });
  }

  /**
   * Throw an error if not initialized.
   */
  ensureInitialized(): void {
    if (!this.initializer.isInitialized) {
      throw new Error(
        'StripeAgentToolkit not initialized. Call await toolkit.initialize() first.'
      );
    }
  }

  /**
   * Warn if accessing tools before initialization.
   */
  warnIfNotInitialized(): void {
    if (!this.initializer.isInitialized) {
      console.warn(
        '[StripeAgentToolkit] Accessing tools before initialization. ' +
          'Call await toolkit.initialize() first, or use createStripeAgentToolkit() factory. ' +
          'Tools will be empty until initialized.'
      );
    }
  }
}

export default ToolkitCore;

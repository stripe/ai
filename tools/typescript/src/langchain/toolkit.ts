import {z} from 'zod';
import {BaseToolkit, StructuredTool} from '@langchain/core/tools';
import {CallbackManagerForToolRun} from '@langchain/core/callbacks/manager';
import {RunnableConfig} from '@langchain/core/runnables';
import StripeAPI from '../shared/api';
import {jsonSchemaToZod} from '../shared/schema-utils';
import {ToolkitCore, ToolkitConfig} from '../shared/toolkit-core';

/**
 * A LangChain StructuredTool that executes Stripe operations via MCP.
 */
class StripeTool extends StructuredTool {
  stripeAPI: StripeAPI;
  method: string;
  name: string;
  description: string;
  schema: z.ZodObject<any, any, any, any>;

  constructor(
    stripeAPI: StripeAPI,
    method: string,
    description: string,
    schema: z.ZodObject<any, any, any, any>
  ) {
    super();
    this.stripeAPI = stripeAPI;
    this.method = method;
    this.name = method;
    this.description = description;
    this.schema = schema;
  }

  _call(
    arg: z.output<typeof this.schema>,
    _runManager?: CallbackManagerForToolRun,
    _parentConfig?: RunnableConfig
  ): Promise<any> {
    return this.stripeAPI.run(this.method, arg);
  }
}

class StripeAgentToolkit implements BaseToolkit {
  private _core: ToolkitCore;
  private _tools: StripeTool[] = [];

  /**
   * The tools available in the toolkit.
   * @deprecated Access tools via getTools() after calling initialize().
   * Direct property access will return empty array if not initialized.
   */
  get tools(): StripeTool[] {
    this._core.warnIfNotInitialized();
    return this._tools;
  }

  constructor(config: ToolkitConfig) {
    this._core = new ToolkitCore(config);
  }

  /**
   * Initialize the toolkit by connecting to the MCP server.
   * Must be called before using tools.
   */
  initialize(): Promise<void> {
    return this._core.initialize((filteredTools) => {
      // Convert MCP tools to LangChain StructuredTools
      this._tools = filteredTools.map((remoteTool) => {
        const zodSchema = jsonSchemaToZod(remoteTool.inputSchema);
        return new StripeTool(
          this._core.stripe,
          remoteTool.name,
          remoteTool.description || remoteTool.name,
          zodSchema
        );
      });
    });
  }

  /**
   * Check if the toolkit has been initialized.
   */
  isInitialized(): boolean {
    return this._core.isInitialized();
  }

  /**
   * Get the tools. Throws if not initialized.
   */
  getTools(): StripeTool[] {
    this._core.ensureInitialized();
    return this._tools;
  }

  /**
   * Close the toolkit connection and clean up resources.
   * Safe to call multiple times (idempotent).
   */
  close(): Promise<void> {
    return this._core.close(() => {
      this._tools = [];
    });
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
 * const tools = toolkit.getTools();
 */
export async function createStripeAgentToolkit(
  config: ToolkitConfig
): Promise<StripeAgentToolkit> {
  const toolkit = new StripeAgentToolkit(config);
  await toolkit.initialize();
  return toolkit;
}

export default StripeAgentToolkit;

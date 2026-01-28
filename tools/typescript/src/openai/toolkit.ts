import {ToolkitCore, ToolkitConfig} from '../shared/toolkit-core';
import type {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from 'openai/resources';

class StripeAgentToolkit {
  private _core: ToolkitCore;
  private _tools: ChatCompletionTool[] = [];

  /**
   * The tools available in the toolkit.
   * @deprecated Access tools via getTools() after calling initialize().
   * Direct property access will return empty array if not initialized.
   */
  get tools(): ChatCompletionTool[] {
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
      // Convert MCP tools to OpenAI ChatCompletionTool format
      // MCP already provides JSON Schema, which OpenAI expects
      this._tools = filteredTools.map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description || tool.name,
          parameters: tool.inputSchema || {type: 'object', properties: {}},
        },
      }));
    });
  }

  /**
   * Check if the toolkit has been initialized.
   */
  isInitialized(): boolean {
    return this._core.isInitialized();
  }

  /**
   * Get the tools in OpenAI ChatCompletionTool format.
   * Throws if not initialized.
   */
  getTools(): ChatCompletionTool[] {
    this._core.ensureInitialized();
    return this._tools;
  }

  /**
   * Processes a single OpenAI tool call by executing the requested function.
   *
   * @param {ChatCompletionMessageToolCall} toolCall - The tool call object from OpenAI containing
   *   function name, arguments, and ID.
   * @returns {Promise<ChatCompletionToolMessageParam>} A promise that resolves to a tool message
   *   object containing the result of the tool execution with the proper format for the OpenAI API.
   */
  async handleToolCall(
    toolCall: ChatCompletionMessageToolCall
  ): Promise<ChatCompletionToolMessageParam> {
    this._core.ensureInitialized();

    const args = JSON.parse(toolCall.function.arguments);
    const response = await this._core.stripe.run(toolCall.function.name, args);
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: response,
    } as ChatCompletionToolMessageParam;
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

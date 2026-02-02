import {ToolkitCore, ToolkitConfig, McpTool} from '../shared/toolkit-core';
import type {
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from 'openai/resources';
import type {FunctionParameters} from 'openai/resources/shared';

class StripeAgentToolkit extends ToolkitCore<ChatCompletionTool[]> {
  constructor(config: ToolkitConfig) {
    super(config, []);
  }

  /**
   * The tools available in the toolkit.
   * @deprecated Access tools via getTools() after calling initialize().
   */
  get tools(): ChatCompletionTool[] {
    return this.getToolsWithWarning();
  }

  protected convertTools(mcpTools: McpTool[]): ChatCompletionTool[] {
    return mcpTools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description || tool.name,
        parameters: (tool.inputSchema || {
          type: 'object',
          properties: {},
        }) as FunctionParameters,
      },
    }));
  }

  close(): Promise<void> {
    return super.close([]);
  }

  /**
   * Processes a single OpenAI tool call by executing the requested function.
   */
  async handleToolCall(
    toolCall: ChatCompletionMessageToolCall
  ): Promise<ChatCompletionToolMessageParam> {
    this.ensureInitialized();

    const args = JSON.parse(toolCall.function.arguments);
    const response = await this.mcpClient.callTool(toolCall.function.name, args);
    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: response,
    } as ChatCompletionToolMessageParam;
  }
}

/**
 * Factory function to create and initialize a StripeAgentToolkit.
 */
export async function createStripeAgentToolkit(
  config: ToolkitConfig
): Promise<StripeAgentToolkit> {
  const toolkit = new StripeAgentToolkit(config);
  await toolkit.initialize();
  return toolkit;
}

export default StripeAgentToolkit;

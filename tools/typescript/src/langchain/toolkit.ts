import {z} from 'zod';
import {BaseToolkit, StructuredTool} from '@langchain/core/tools';
import {CallbackManagerForToolRun} from '@langchain/core/callbacks/manager';
import {RunnableConfig} from '@langchain/core/runnables';
import {jsonSchemaToZod} from '../shared/schema-utils';
import {ToolkitCore, ToolkitConfig, McpTool} from '../shared/toolkit-core';

/**
 * A function that executes a tool call and returns the result.
 */
type ToolCallFn = (
  name: string,
  args: Record<string, unknown>
) => Promise<string>;

/**
 * A LangChain StructuredTool that executes Stripe operations via MCP.
 * Routes tool calls through ToolkitCore to reach the correct MCP server.
 */
class StripeTool extends StructuredTool {
  private callToolFn: ToolCallFn;
  method: string;
  name: string;
  description: string;
  schema: z.ZodObject<any, any, any, any>;

  constructor(
    callToolFn: ToolCallFn,
    method: string,
    description: string,
    schema: z.ZodObject<any, any, any, any>
  ) {
    super();
    this.callToolFn = callToolFn;
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
    return this.callToolFn(this.method, arg);
  }
}

// Use intersection type to satisfy both ToolkitCore and BaseToolkit
class StripeAgentToolkit
  extends ToolkitCore<StripeTool[]>
  implements BaseToolkit
{
  constructor(config: ToolkitConfig) {
    super(config, []);
  }

  /**
   * The tools available in the toolkit.
   * Required by BaseToolkit interface.
   * @deprecated Access tools via getTools() after calling initialize().
   */
  get tools(): StripeTool[] {
    return this.getToolsWithWarning();
  }

  protected convertTools(mcpTools: McpTool[]): StripeTool[] {
    // Bind the routing function so tools from additional servers
    // are routed correctly
    const callToolFn: ToolCallFn = (name, args) =>
      this.routeToolCall(name, args);

    return mcpTools.map((tool) => {
      const zodSchema = jsonSchemaToZod(tool.inputSchema);
      return new StripeTool(
        callToolFn,
        tool.name,
        tool.description || tool.name,
        zodSchema
      );
    });
  }

  close(): Promise<void> {
    return super.close([]);
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

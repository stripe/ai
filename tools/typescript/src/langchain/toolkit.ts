import {z} from 'zod';
import {BaseToolkit, StructuredTool} from '@langchain/core/tools';
import {CallbackManagerForToolRun} from '@langchain/core/callbacks/manager';
import {RunnableConfig} from '@langchain/core/runnables';
import {jsonSchemaToZod} from '../shared/schema-utils';
import {ToolkitCore, ToolkitConfig, McpTool} from '../shared/toolkit-core';
import type {StripeMcpClient} from '../shared/mcp-client';

/**
 * A LangChain StructuredTool that executes Stripe operations via MCP.
 */
class StripeTool extends StructuredTool {
  private mcpClient: StripeMcpClient;
  method: string;
  name: string;
  description: string;
  schema: z.ZodObject<any, any, any, any>;

  constructor(
    mcpClient: StripeMcpClient,
    method: string,
    description: string,
    schema: z.ZodObject<any, any, any, any>
  ) {
    super();
    this.mcpClient = mcpClient;
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
    return this.mcpClient.callTool(this.method, arg);
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
    return mcpTools.map((tool) => {
      const zodSchema = jsonSchemaToZod(tool.inputSchema);
      return new StripeTool(
        this.mcpClient,
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

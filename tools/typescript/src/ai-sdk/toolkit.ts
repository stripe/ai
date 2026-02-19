import {tool, Tool} from 'ai';
import {z} from 'zod';
import {jsonSchemaToZod} from '../shared/schema-utils';
import {ToolkitCore, ToolkitConfig, McpTool} from '../shared/toolkit-core';

type ProviderTool = Tool<any, any>;

class StripeAgentToolkit extends ToolkitCore<Record<string, ProviderTool>> {
  constructor(config: ToolkitConfig) {
    super(config, {});
  }

  /**
   * The tools available in the toolkit.
   * @deprecated Access tools via getTools() after calling initialize().
   */
  get tools(): Record<string, ProviderTool> {
    return this.getToolsWithWarning();
  }

  protected convertTools(mcpTools: McpTool[]): Record<string, ProviderTool> {
    const tools: Record<string, ProviderTool> = {};

    for (const remoteTool of mcpTools) {
      const zodSchema = jsonSchemaToZod(remoteTool.inputSchema);

      tools[remoteTool.name] = tool({
        description: remoteTool.description || remoteTool.name,
        inputSchema: zodSchema,
        execute: (args: z.infer<typeof zodSchema>) => {
          return this.mcpClient.callTool(remoteTool.name, args);
        },
      });
    }

    return tools;
  }

  close(): Promise<void> {
    return super.close({});
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

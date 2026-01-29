import {tool, Tool} from 'ai';
import {z} from 'zod';
import {jsonSchemaToZod} from '../shared/schema-utils';
import {ToolkitCore, ToolkitConfig, McpTool} from '../shared/toolkit-core';
import type {
  LanguageModelV2Middleware,
  LanguageModelV2Usage,
} from '@ai-sdk/provider';

type ProviderTool = Tool<any, any>;
type WrapGenerateOptions = Parameters<
  NonNullable<LanguageModelV2Middleware['wrapGenerate']>
>[0];
type WrapStreamOptions = Parameters<
  NonNullable<LanguageModelV2Middleware['wrapStream']>
>[0];

type StripeMiddlewareConfig = {
  billing?: {
    type?: 'token';
    customer: string;
    meters: {
      input?: string;
      output?: string;
    };
  };
};

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
          return this.stripe.run(remoteTool.name, args);
        },
      });
    }

    return tools;
  }

  close(): Promise<void> {
    return super.close({});
  }

  /**
   * Middleware for billing based on token usage.
   * Note: This uses direct Stripe SDK calls, not MCP.
   */
  middleware(config: StripeMiddlewareConfig): LanguageModelV2Middleware {
    const stripe = this.stripe;

    const bill = async (usage?: LanguageModelV2Usage) => {
      if (!config.billing || !usage) {
        return;
      }

      const {inputTokens, outputTokens} = usage;
      const inputValue = (inputTokens ?? 0).toString();
      const outputValue = (outputTokens ?? 0).toString();

      if (config.billing.meters.input) {
        await stripe.createMeterEvent({
          event: config.billing.meters.input,
          customer: config.billing.customer,
          value: inputValue,
        });
      }

      if (config.billing.meters.output) {
        await stripe.createMeterEvent({
          event: config.billing.meters.output,
          customer: config.billing.customer,
          value: outputValue,
        });
      }
    };

    return {
      wrapGenerate: async ({doGenerate}: WrapGenerateOptions) => {
        const result = await doGenerate();
        await bill(result.usage);
        return result;
      },

      wrapStream: async ({doStream}: WrapStreamOptions) => {
        const {stream, ...rest} = await doStream();

        const transformStream = new TransformStream<any, any>({
          async transform(chunk, controller) {
            if (chunk?.type === 'finish') {
              await bill(chunk.usage);
            }
            controller.enqueue(chunk);
          },
        });

        return {
          stream: stream.pipeThrough(transformStream),
          ...rest,
        };
      },
    };
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

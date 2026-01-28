import {tool, Tool} from 'ai';
import {z} from 'zod';
import {jsonSchemaToZod} from '../shared/schema-utils';
import {ToolkitCore, ToolkitConfig} from '../shared/toolkit-core';
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

class StripeAgentToolkit {
  private _core: ToolkitCore;
  private _tools: Record<string, ProviderTool> = {};

  /**
   * The tools available in the toolkit.
   * @deprecated Access tools via getTools() after calling initialize().
   * Direct property access will return empty object if not initialized.
   */
  get tools(): Record<string, ProviderTool> {
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
      // Convert MCP tools to AI SDK format
      for (const remoteTool of filteredTools) {
        const zodSchema = jsonSchemaToZod(remoteTool.inputSchema);

        this._tools[remoteTool.name] = tool({
          description: remoteTool.description || remoteTool.name,
          inputSchema: zodSchema,
          execute: (args: z.infer<typeof zodSchema>) => {
            return this._core.stripe.run(remoteTool.name, args);
          },
        });
      }
    });
  }

  /**
   * Check if the toolkit has been initialized.
   */
  isInitialized(): boolean {
    return this._core.isInitialized();
  }

  /**
   * Middleware for billing based on token usage.
   * Note: This uses direct Stripe SDK calls, not MCP.
   */
  middleware(config: StripeMiddlewareConfig): LanguageModelV2Middleware {
    const bill = async (usage?: LanguageModelV2Usage) => {
      if (!config.billing || !usage) {
        return;
      }

      const {inputTokens, outputTokens} = usage;
      const inputValue = (inputTokens ?? 0).toString();
      const outputValue = (outputTokens ?? 0).toString();

      if (config.billing.meters.input) {
        await this._core.stripe.createMeterEvent({
          event: config.billing.meters.input,
          customer: config.billing.customer,
          value: inputValue,
        });
      }

      if (config.billing.meters.output) {
        await this._core.stripe.createMeterEvent({
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

  /**
   * Get the tools. Throws if not initialized.
   */
  getTools(): Record<string, ProviderTool> {
    this._core.ensureInitialized();
    return this._tools;
  }

  /**
   * Close the toolkit connection and clean up resources.
   * Safe to call multiple times (idempotent).
   */
  close(): Promise<void> {
    return this._core.close(() => {
      this._tools = {};
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

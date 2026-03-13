/**
 * AI SDK Model Wrapper (v3 specification)
 */

import Stripe from 'stripe';
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
} from '@ai-sdk/provider';
import type {AIMeterConfig, AIUsageInfo} from './types';
import {determineProvider, extractUsageFromStreamV3} from './utils';
import {logUsageEvent} from './meter-event-logging';

/**
 * Wrapper class for AI SDK v3 models that adds Stripe meter event tracking
 */
export class AISDKWrapperV3 implements LanguageModelV3 {
  private stripeClient: Stripe;

  constructor(
    private model: LanguageModelV3,
    private config: AIMeterConfig
  ) {
    this.stripeClient = new Stripe(config.stripeApiKey, {
      appInfo: {
        name: '@stripe/ai-sdk/meter',
        version: '0.1.0',
      },
    });
  }

  async doGenerate(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3GenerateResult> {
    try {
      const response = await this.model.doGenerate(options);

      const usageInfo: AIUsageInfo = {
        provider: determineProvider(this.model.provider),
        model: this.model.modelId,
        inputTokens: response.usage?.inputTokens?.total ?? 0,
        outputTokens: response.usage?.outputTokens?.total ?? 0,
      };

      this.logUsage(usageInfo);

      return response;
    } catch (error) {
      console.error('[Stripe AI SDK] doGenerate failed:', error);
      throw error;
    }
  }

  async doStream(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3StreamResult> {
    try {
      const response = await this.model.doStream(options);

      const chunks: LanguageModelV3StreamPart[] = [];
      const stream = new ReadableStream<LanguageModelV3StreamPart>({
        start: async (controller) => {
          try {
            const reader = response.stream.getReader();

            while (true) {
              const {done, value} = await reader.read();

              if (done) {
                const usage = extractUsageFromStreamV3(chunks);
                const usageInfo: AIUsageInfo = {
                  provider: determineProvider(this.model.provider),
                  model: this.model.modelId,
                  inputTokens: usage.inputTokens,
                  outputTokens: usage.outputTokens,
                };

                this.logUsage(usageInfo);

                controller.close();
                break;
              }

              chunks.push(value);
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
            console.error(
              '[Stripe AI SDK] Stream processing failed:',
              error
            );
          }
        },
      });

      return {
        ...response,
        stream: stream,
      };
    } catch (error) {
      console.error('[Stripe AI SDK] doStream failed:', error);
      throw error;
    }
  }

  private logUsage(usageInfo: AIUsageInfo): void {
    logUsageEvent(this.stripeClient, {}, {
      model: usageInfo.model,
      provider: usageInfo.provider,
      usage: {
        inputTokens: usageInfo.inputTokens,
        outputTokens: usageInfo.outputTokens,
      },
      stripeCustomerId: this.config.stripeCustomerId,
    });
  }

  get modelId() {
    return this.model.modelId;
  }

  get provider() {
    return this.model.provider;
  }

  get specificationVersion() {
    return this.model.specificationVersion;
  }

  get supportedUrls() {
    return this.model.supportedUrls;
  }
}

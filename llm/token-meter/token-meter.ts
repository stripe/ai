/**
 * Generic token metering implementation
 */

import Stripe from 'stripe';
import type OpenAI from 'openai';
import type {Stream as OpenAIStream} from 'openai/streaming';
import type Anthropic from '@anthropic-ai/sdk';
import type {Stream as AnthropicStream} from '@anthropic-ai/sdk/streaming';
import type {
  GenerateContentResult,
  GenerateContentStreamResult,
} from '@google/generative-ai';
import type {MeterConfig} from './types';
import {logUsageEvent} from './meter-event-logging';
import {
  detectResponse,
  isGeminiStream,
  type DetectedResponse,
} from './utils/type-detection';

function wrapSdkStream<T extends AsyncIterable<unknown> & {controller: AbortController}>(
  source: T,
  iterator: () => AsyncIterator<unknown>
): T {
  const StreamConstructor = source.constructor as new (
    iterator: () => AsyncIterator<unknown>,
    controller: AbortController
  ) => T;

  // The SDK streams are class instances. Keeping this fallback makes the
  // structural test doubles accepted by the existing public type usable too.
  if ((StreamConstructor as unknown) === Object) {
    return {
      controller: source.controller,
      [Symbol.asyncIterator]: iterator,
    } as T;
  }

  return new StreamConstructor(iterator, source.controller);
}

/**
 * Supported response types from all AI providers
 */
export type SupportedResponse =
  | OpenAI.ChatCompletion
  | OpenAI.Responses.Response
  | OpenAI.CreateEmbeddingResponse
  | Anthropic.Messages.Message
  | GenerateContentResult;

/**
 * Supported stream types from all AI providers
 */
export type SupportedStream =
  | OpenAIStream<OpenAI.ChatCompletionChunk>
  | OpenAIStream<OpenAI.Responses.ResponseStreamEvent>
  | AnthropicStream<Anthropic.Messages.RawMessageStreamEvent>
  | GenerateContentStreamResult;

/**
 * Generic token meter interface
 */
export interface TokenMeter {
  /**
   * Track usage from any supported response type (fire-and-forget)
   * Automatically detects provider and response type
   */
  trackUsage(response: SupportedResponse, stripeCustomerId: string): void;

  /**
   * Track usage from OpenAI streaming response
   * Model name is automatically extracted from the stream
   * Returns the wrapped stream for consumption
   */
  trackUsageStreamOpenAI<
    T extends
      | OpenAIStream<OpenAI.ChatCompletionChunk>
      | OpenAIStream<OpenAI.Responses.ResponseStreamEvent>
  >(
    stream: T,
    stripeCustomerId: string
  ): T;

  /**
   * Track usage from Anthropic streaming response
   * Model name is automatically extracted from the stream
   * Returns the wrapped stream for consumption
   */
  trackUsageStreamAnthropic(
    stream: AnthropicStream<Anthropic.Messages.RawMessageStreamEvent>,
    stripeCustomerId: string
  ): AnthropicStream<Anthropic.Messages.RawMessageStreamEvent>;

  /**
   * Track usage from Gemini/Google streaming response
   * Model name must be provided as Gemini streams don't include it
   * Returns the wrapped stream for consumption
   */
  trackUsageStreamGemini(
    stream: GenerateContentStreamResult,
    stripeCustomerId: string,
    modelName: string
  ): GenerateContentStreamResult;
}

/**
 * Create a generic token meter that works with any supported AI provider
 *
 * @param stripeApiKey - Your Stripe API key
 * @param config - Optional configuration for the meter
 * @returns TokenMeter instance for tracking usage
 */
export function createTokenMeter(
  stripeApiKey: string,
  config: MeterConfig = {}
): TokenMeter {
  // Construct Stripe client with the API key
  const stripeClient = new Stripe(stripeApiKey, {
    appInfo: {
      name: '@stripe/token-meter',
      version: '0.1.0',
    },
  });
  return {
    trackUsage(response: SupportedResponse, stripeCustomerId: string): void {
      const detected = detectResponse(response);

      if (!detected) {
        console.warn(
          'Unable to detect response type. Supported types: OpenAI ChatCompletion, Responses API, Embeddings'
        );
        return;
      }

      // Fire-and-forget logging
      logUsageEvent(stripeClient, config, {
        model: detected.model,
        provider: detected.provider,
        usage: {
          inputTokens: detected.inputTokens,
          outputTokens: detected.outputTokens,
        },
        stripeCustomerId,
      });
    },

    trackUsageStreamGemini(
      stream: GenerateContentStreamResult,
      stripeCustomerId: string,
      modelName: string
    ): GenerateContentStreamResult {
      const originalStream = stream.stream;
        
        const wrappedStream = (async function* () {
          let lastUsageMetadata: any = null;

          for await (const chunk of originalStream) {
            if (chunk.usageMetadata) {
              lastUsageMetadata = chunk.usageMetadata;
            }
            yield chunk;
          }

          // Log usage after stream completes
          if (lastUsageMetadata) {
            const baseOutputTokens = lastUsageMetadata?.candidatesTokenCount ?? 0;
            // thoughtsTokenCount is for extended thinking models, may not always be present
            const reasoningTokens = (lastUsageMetadata as any)?.thoughtsTokenCount ?? 0;

            logUsageEvent(stripeClient, config, {
              model: modelName,
              provider: 'google',
              usage: {
                inputTokens: lastUsageMetadata?.promptTokenCount ?? 0,
                outputTokens: baseOutputTokens + reasoningTokens,
              },
              stripeCustomerId,
            });
          }
        })();

        // Return the wrapped structure
        return {
          stream: wrappedStream,
          response: stream.response,
        };
    },

    trackUsageStreamOpenAI<
      T extends
        | OpenAIStream<OpenAI.ChatCompletionChunk>
        | OpenAIStream<OpenAI.Responses.ResponseStreamEvent>
    >(stream: T, stripeCustomerId: string): T {
      const meteredStream = wrapSdkStream(
        stream,
        async function* () {
          let streamType: 'chat_completion' | 'response_api' | null = null;
          let model = '';
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const value of stream) {
            const chunk = value as any;

            if (!streamType) {
              if ('choices' in chunk && Array.isArray(chunk.choices)) {
                streamType = 'chat_completion';
              } else if (
                chunk.type &&
                typeof chunk.type === 'string' &&
                chunk.type.startsWith('response.')
              ) {
                streamType = 'response_api';
              }
            }

            if (streamType === 'chat_completion') {
              model = chunk.model || model;
              if (chunk.usage) {
                inputTokens = chunk.usage.prompt_tokens ?? 0;
                outputTokens = chunk.usage.completion_tokens ?? 0;
              }
            } else if (streamType === 'response_api' && chunk.response) {
              model = chunk.response.model || model;
              if (chunk.response.usage) {
                inputTokens = chunk.response.usage.input_tokens ?? 0;
                outputTokens = chunk.response.usage.output_tokens ?? 0;
              }
            }

            yield value;
          }

          const detected: DetectedResponse | null =
            streamType && model
              ? {
                  provider: 'openai',
                  type: streamType,
                  model,
                  inputTokens,
                  outputTokens,
                }
              : null;

          if (detected) {
            logUsageEvent(stripeClient, config, {
              model: detected.model,
              provider: detected.provider,
              usage: {
                inputTokens: detected.inputTokens,
                outputTokens: detected.outputTokens,
              },
              stripeCustomerId,
            });
          } else {
            console.warn('Unable to extract usage from OpenAI stream');
          }
        }
      );

      return meteredStream as T;
    },

    trackUsageStreamAnthropic(
      stream: AnthropicStream<Anthropic.Messages.RawMessageStreamEvent>,
      stripeCustomerId: string
    ): AnthropicStream<Anthropic.Messages.RawMessageStreamEvent> {
      return wrapSdkStream(
        stream,
        async function* () {
          let model = '';
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const chunk of stream) {
            if (chunk.type === 'message_start') {
              model = chunk.message.model;
              inputTokens = chunk.message.usage.input_tokens ?? 0;
            } else if (chunk.type === 'message_delta') {
              outputTokens = chunk.usage.output_tokens ?? 0;
            }

            yield chunk;
          }

          const detected: DetectedResponse | null = model
            ? {
                provider: 'anthropic',
                type: 'chat_completion',
                model,
                inputTokens,
                outputTokens,
              }
            : null;

          if (detected) {
            logUsageEvent(stripeClient, config, {
              model: detected.model,
              provider: detected.provider,
              usage: {
                inputTokens: detected.inputTokens,
                outputTokens: detected.outputTokens,
              },
              stripeCustomerId,
            });
          } else {
            console.warn('Unable to extract usage from Anthropic stream');
          }
        }
      ) as AnthropicStream<Anthropic.Messages.RawMessageStreamEvent>;
    },
  };
}


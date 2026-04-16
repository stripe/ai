/**
 * Stripe Language Model implementation for AI SDK V2
 */

import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import {
  ParseResult,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  createStatusCodeErrorResponseHandler,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import {z} from 'zod';
import {StripeLanguageModelSettings, StripeProviderOptions} from './types';
import {convertToOpenAIMessages, mapOpenAIFinishReason} from './utils';

/**
 * OpenAI-compatible chat completion response schema
 */
const openAIResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              type: z.literal('function'),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            })
          )
          .optional(),
      }),
      finish_reason: z.string().nullable(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

type OpenAIResponse = z.infer<typeof openAIResponseSchema>;

/**
 * OpenAI-compatible streaming chunk schema
 * Note: The event source handler may also return '[DONE]' string or null
 */
const openAIStreamChunkSchema = z
  .union([
    z.object({
      choices: z
        .array(
          z.object({
            delta: z.object({
              content: z.string().optional(),
              tool_calls: z
                .array(
                  z.object({
                    index: z.number(),
                    id: z.string().optional(),
                    function: z
                      .object({
                        name: z.string().optional(),
                        arguments: z.string().optional(),
                      })
                      .optional(),
                  })
                )
                .optional(),
            }),
            finish_reason: z.string().nullable().optional(),
          })
        )
        .optional(),
      usage: z
        .object({
          prompt_tokens: z.number().optional(),
          completion_tokens: z.number().optional(),
          total_tokens: z.number().optional(),
        })
        .optional(),
    }),
    z.literal('[DONE]'),
    z.null(),
  ])
  .catch(null);

type OpenAIStreamChunk = z.infer<typeof openAIStreamChunkSchema>;

/**
 * Enhanced error class for Stripe AI SDK Provider access issues
 */
export class StripeProviderAccessError extends Error {
  constructor(originalError: any) {
    const message = [
      'Stripe AI SDK Provider Access Required',
      '',
      'You are probably seeing this error because you have not been granted access to the Stripe AI SDK Provider Private Preview.',
      '',
      'To request access, please fill out the form here:',
      'https://docs.stripe.com/billing/token-billing',
      '',
      '---',
      'Original error: ' + (originalError.message || 'Unknown error'),
    ].join('\n');
    
    super(message);
    this.name = 'StripeProviderAccessError';
    
    // Preserve the original error
    this.cause = originalError;
  }
}

interface StripeProviderConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
}

/**
 * Stripe Language Model that implements the AI SDK V2 specification
 */
export class StripeLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly provider: string;
  readonly modelId: string;

  private readonly settings: StripeLanguageModelSettings;
  private readonly config: StripeProviderConfig;

  constructor(
    modelId: string,
    settings: StripeLanguageModelSettings,
    config: StripeProviderConfig
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  /**
   * Stripe proxy doesn't require special URL handling - it accepts standard base64 data
   */
  get supportedUrls() {
    return {};
  }

  /**
   * Check if an error is due to lack of access to the Stripe AI SDK Provider
   */
  private isAccessDeniedError(error: any): boolean {
    // Check for the specific "Unrecognized request URL" error
    if (error.statusCode === 400 && error.responseBody) {
      try {
        const body = typeof error.responseBody === 'string' 
          ? JSON.parse(error.responseBody)
          : error.responseBody;
        
        if (body.error?.type === 'invalid_request_error' && 
            body.error?.message?.includes('Unrecognized request URL')) {
          return true;
        }
      } catch {
        // If we can't parse the response, it's not the error we're looking for
      }
    }
    return false;
  }

  /**
   * Wrap API call errors with helpful messaging for access issues
   */
  private handleApiError(error: any): never {
    if (this.isAccessDeniedError(error)) {
      throw new StripeProviderAccessError(error);
    }
    throw error;
  }

  /**
   * Get model-specific default max output tokens for Anthropic models
   * Based on the official Anthropic provider implementation
   * @see https://github.com/vercel/ai/blob/main/packages/anthropic/src/anthropic-messages-language-model.ts
   */
  private getDefaultMaxTokens(modelId: string): number | undefined {
    if (!modelId.startsWith('anthropic/')) {
      return undefined; // No default for non-Anthropic models
    }

    // Extract model name after 'anthropic/' prefix
    const model = modelId.substring('anthropic/'.length);

    // Claude Sonnet 4 models (including variants like sonnet-4-1) and 3.7 Sonnet
    if (model.includes('sonnet-4') || 
        model.includes('claude-3-7-sonnet') || 
        model.includes('haiku-4-5')) {
      return 64000; // 64K tokens
    } 
    // Claude Opus 4 models (including variants like opus-4-1)
    else if (model.includes('opus-4')) {
      return 32000; // 32K tokens
    } 
    // Claude 3.5 Haiku
    else if (model.includes('claude-3-5-haiku')) {
      return 8192; // 8K tokens
    } 
    // Default fallback for other Anthropic models
    else {
      return 4096;
    }
  }

  private getHeaders(
    options: LanguageModelV2CallOptions
  ): Record<string, string> {
    const baseHeaders = this.config.headers();
    const settingsHeaders = this.settings.headers || {};

    // Get provider-specific options
    const stripeOptions = (options.providerOptions?.stripe ||
      {}) as StripeProviderOptions;

    // Determine customer ID (priority: providerOptions > settings > error)
    const customerId =
      stripeOptions.customerId || this.settings.customerId || '';

    if (!customerId) {
      throw new Error(
        'Stripe customer ID is required. Provide it via provider settings or providerOptions.'
      );
    }

    return {
      ...baseHeaders,
      ...settingsHeaders,
      ...(stripeOptions.headers || {}),
      'X-Stripe-Customer-ID': customerId,
    };
  }

  private getArgs(options: LanguageModelV2CallOptions) {
    const warnings: LanguageModelV2CallWarning[] = [];

    // Convert AI SDK prompt to OpenAI-compatible format
    const messages = convertToOpenAIMessages(options.prompt);

    // Tool calling is not supported by the Stripe AI SDK Provider.
    if (options.tools && options.tools.length > 0) {
      throw new Error(
        'Tool calling is not supported by the Stripe AI SDK Provider. ' +
          'The llm.stripe.com API does not currently support function calling or tool use. ' +
          'Please remove the tools and toolChoice parameters from your request.'
      );
    }

    if (options.toolChoice !== undefined) {
      throw new Error(
        'Tool calling is not supported by the Stripe AI SDK Provider. ' +
          'The llm.stripe.com API does not currently support function calling or tool use. ' +
          'Please remove the tools and toolChoice parameters from your request.'
      );
    }

    // Build request body, only including defined values
    const body: Record<string, any> = {
      model: this.modelId,
      messages,
    };

    // Add optional parameters only if they're defined
    if (options.temperature !== undefined) body.temperature = options.temperature;

    // Handle max_tokens with model-specific defaults for Anthropic
    const maxTokens = options.maxOutputTokens ?? this.getDefaultMaxTokens(this.modelId);
    if (maxTokens !== undefined) body.max_tokens = maxTokens;

    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.frequencyPenalty !== undefined)
      body.frequency_penalty = options.frequencyPenalty;
    if (options.presencePenalty !== undefined)
      body.presence_penalty = options.presencePenalty;
    if (options.stopSequences !== undefined) body.stop = options.stopSequences;
    if (options.seed !== undefined) body.seed = options.seed;

    return {args: body, warnings};
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const {args, warnings} = this.getArgs(options);
    const headers = this.getHeaders(options);

    let response: OpenAIResponse;
    try {
      const result = await postJsonToApi({
        url: `${this.config.baseURL}/chat/completions`,
        headers,
        body: args,
        failedResponseHandler: createStatusCodeErrorResponseHandler(),
        successfulResponseHandler: createJsonResponseHandler(openAIResponseSchema),
        abortSignal: options.abortSignal,
      });
      response = result.value;
    } catch (error) {
      this.handleApiError(error);
    }

    const choice = response.choices[0];

    // Convert response to AI SDK V2 format
    const content: LanguageModelV2Content[] = [];

    // Add text content if present
    if (choice.message.content) {
      content.push({
        type: 'text',
        text: choice.message.content,
      });
    }

    // Add tool calls if present
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        content.push({
          type: 'tool-call',
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          input: toolCall.function.arguments,
        });
      }
    }

    return {
      content,
      finishReason: mapOpenAIFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
      request: {body: args},
      response: {
        headers: {},
        body: response,
      },
      warnings,
    };
  }

  async doStream(options: LanguageModelV2CallOptions) {
    const {args, warnings} = this.getArgs(options);
    const headers = this.getHeaders(options);

    let response: ReadableStream<ParseResult<OpenAIStreamChunk>>;
    try {
      const result = await postJsonToApi({
        url: `${this.config.baseURL}/chat/completions`,
        headers,
        body: {
          ...args,
          stream: true,
          stream_options: {include_usage: true},
        },
        failedResponseHandler: createStatusCodeErrorResponseHandler(),
        successfulResponseHandler: createEventSourceResponseHandler(openAIStreamChunkSchema),
        abortSignal: options.abortSignal,
      });
      response = result.value as ReadableStream<ParseResult<OpenAIStreamChunk>>;
    } catch (error) {
      this.handleApiError(error);
    }

    let finishReason: LanguageModelV2FinishReason = 'unknown';
    let usage = {
      inputTokens: undefined as number | undefined,
      outputTokens: undefined as number | undefined,
      totalTokens: undefined as number | undefined,
    };

    // Track tool calls during streaming
    const toolCallDeltas: Record<
      number,
      {
        id: string;
        name: string;
        input: string;
      }
    > = {};

    // Track text chunks with IDs
    let currentTextId = '';

    return {
      stream: response.pipeThrough(
        new TransformStream<ParseResult<OpenAIStreamChunk>, LanguageModelV2StreamPart>({
          transform(chunk, controller) {
            if (!chunk.success) {
              controller.enqueue({type: 'error', error: chunk.error});
              return;
            }

            // The value is already parsed as an object by the event source handler
            // If value is null (schema validation failed), use rawValue
            const data = chunk.value ?? (chunk.rawValue as OpenAIStreamChunk);
            
            // Skip empty or [DONE] events
            if (!data || data === '[DONE]') {
              return;
            }

            try {
              // Type guard: at this point we know data is not null or '[DONE]'
              if (typeof data === 'object' && 'choices' in data && data.choices && data.choices.length > 0) {
                const delta = data.choices[0].delta;

                // Handle text content
                // Check if content exists (including empty string "") rather than checking truthiness
                if ('content' in delta && delta.content !== null && delta.content !== undefined) {
                  if (!currentTextId) {
                    currentTextId = `text-${Date.now()}`;
                    controller.enqueue({
                      type: 'text-start',
                      id: currentTextId,
                    });
                  }
                  // Only emit text-delta if content is not empty
                  if (delta.content !== '') {
                    controller.enqueue({
                      type: 'text-delta',
                      id: currentTextId,
                      delta: delta.content,
                    });
                  }
                }

                // Handle tool calls
                if (delta.tool_calls) {
                  for (const toolCall of delta.tool_calls) {
                    const index = toolCall.index;

                    // Initialize or update tool call
                    if (!toolCallDeltas[index]) {
                      const id = toolCall.id || `tool-${Date.now()}-${index}`;
                      toolCallDeltas[index] = {
                        id,
                        name: toolCall.function?.name || '',
                        input: '',
                      };

                      // Emit tool-input-start
                      controller.enqueue({
                        type: 'tool-input-start',
                        id,
                        toolName: toolCallDeltas[index].name,
                      });
                    }

                    if (toolCall.id) {
                      toolCallDeltas[index].id = toolCall.id;
                    }
                    if (toolCall.function?.name) {
                      toolCallDeltas[index].name = toolCall.function.name;
                    }
                    if (toolCall.function?.arguments) {
                      toolCallDeltas[index].input += toolCall.function.arguments;

                      // Emit the delta
                      controller.enqueue({
                        type: 'tool-input-delta',
                        id: toolCallDeltas[index].id,
                        delta: toolCall.function.arguments,
                      });
                    }
                  }
                }

                // Handle finish reason
                if (data.choices[0].finish_reason) {
                  finishReason = mapOpenAIFinishReason(
                    data.choices[0].finish_reason
                  );
                }
              }

              // Handle usage (typically comes in final chunk)
              if (typeof data === 'object' && 'usage' in data && data.usage) {
                usage = {
                  inputTokens: data.usage.prompt_tokens || undefined,
                  outputTokens: data.usage.completion_tokens || undefined,
                  totalTokens: data.usage.total_tokens || undefined,
                };
              }
            } catch (error) {
              controller.enqueue({
                type: 'error',
                error: error,
              });
            }
          },

          flush(controller) {
            // End current text if any
            if (currentTextId) {
              controller.enqueue({
                type: 'text-end',
                id: currentTextId,
              });
            }

            // Emit final tool calls
            for (const toolCall of Object.values(toolCallDeltas)) {
              controller.enqueue({
                type: 'tool-input-end',
                id: toolCall.id,
              });
              controller.enqueue({
                type: 'tool-call',
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                input: toolCall.input,
              });
            }

            // Emit finish event
            controller.enqueue({
              type: 'finish',
              finishReason,
              usage,
            });
          },
        })
      ),
      request: {body: args},
      response: {headers: {}},
      warnings,
    };
  }
}

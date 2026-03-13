/**
 * Stripe Language Model implementation for AI SDK V3
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage,
} from '@ai-sdk/provider';
import {
  ParseResult,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  createStatusCodeErrorResponseHandler,
  postJsonToApi,
} from '@ai-sdk/provider-utils';
import {z} from 'zod';
import type {StripeLanguageModelSettings, StripeProviderOptions} from './types';
import {convertToOpenAIMessagesV3, mapOpenAIFinishReasonV3} from './utils-v3';
import {normalizeModelId} from './utils';
import {StripeProviderAccessError} from './stripe-language-model';

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

interface StripeProviderConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
}

function buildV3Usage(
  promptTokens: number | undefined,
  completionTokens: number | undefined
): LanguageModelV3Usage {
  return {
    inputTokens: {
      total: promptTokens ?? undefined,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: completionTokens ?? undefined,
      text: undefined,
      reasoning: undefined,
    },
  };
}

/**
 * Stripe Language Model that implements the AI SDK V3 specification
 */
export class StripeLanguageModelV3 implements LanguageModelV3 {
  readonly specificationVersion = 'v3' as const;
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

  get supportedUrls() {
    return {};
  }

  private isAccessDeniedError(error: any): boolean {
    if (error.statusCode === 400 && error.responseBody) {
      try {
        const body =
          typeof error.responseBody === 'string'
            ? JSON.parse(error.responseBody)
            : error.responseBody;

        if (
          body.error?.type === 'invalid_request_error' &&
          body.error?.message?.includes('Unrecognized request URL')
        ) {
          return true;
        }
      } catch {
        // Not the error we're looking for
      }
    }
    return false;
  }

  private handleApiError(error: any): never {
    if (this.isAccessDeniedError(error)) {
      throw new StripeProviderAccessError(error);
    }
    throw error;
  }

  private getDefaultMaxTokens(modelId: string): number | undefined {
    if (!modelId.startsWith('anthropic/')) {
      return undefined;
    }

    const model = modelId.substring('anthropic/'.length);

    if (
      model.includes('sonnet-4') ||
      model.includes('claude-3-7-sonnet') ||
      model.includes('haiku-4-5')
    ) {
      return 64000;
    } else if (model.includes('opus-4')) {
      return 32000;
    } else if (model.includes('claude-3-5-haiku')) {
      return 8192;
    } else {
      return 4096;
    }
  }

  private getHeaders(
    options: LanguageModelV3CallOptions
  ): Record<string, string> {
    const baseHeaders = this.config.headers();
    const settingsHeaders = this.settings.headers || {};

    const stripeOptions = (options.providerOptions?.stripe ||
      {}) as StripeProviderOptions;

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

  private getArgs(options: LanguageModelV3CallOptions) {
    const warnings: LanguageModelV3GenerateResult['warnings'] = [];

    const messages = convertToOpenAIMessagesV3(options.prompt);

    if (options.tools && options.tools.length > 0) {
      throw new Error(
        'Tool calling is not supported by the Stripe AI SDK Provider. ' +
          'The llm.stripe.com API does not currently support function calling or tool use. ' +
          'Please remove the tools parameter from your request.'
      );
    }

    const tools =
      options.tools && options.tools.length > 0
        ? options.tools.map((tool) => {
            if (tool.type === 'function') {
              return {
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputSchema,
                },
              };
            }
            return tool;
          })
        : undefined;

    let toolChoice:
      | string
      | {type: string; function?: {name: string}}
      | undefined;
    if (options.toolChoice) {
      if (options.toolChoice.type === 'tool') {
        toolChoice = {
          type: 'function',
          function: {name: options.toolChoice.toolName},
        };
      } else {
        toolChoice = options.toolChoice.type;
      }
    }

    const body: Record<string, any> = {
      model: this.modelId,
      messages,
    };

    if (options.temperature !== undefined)
      body.temperature = options.temperature;

    const maxTokens =
      options.maxOutputTokens ?? this.getDefaultMaxTokens(this.modelId);
    if (maxTokens !== undefined) body.max_tokens = maxTokens;

    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.frequencyPenalty !== undefined)
      body.frequency_penalty = options.frequencyPenalty;
    if (options.presencePenalty !== undefined)
      body.presence_penalty = options.presencePenalty;
    if (options.stopSequences !== undefined)
      body.stop = options.stopSequences;
    if (options.seed !== undefined) body.seed = options.seed;
    if (tools !== undefined) body.tools = tools;
    if (toolChoice !== undefined) body.tool_choice = toolChoice;

    return {args: body, warnings};
  }

  async doGenerate(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3GenerateResult> {
    const {args, warnings} = this.getArgs(options);
    const headers = this.getHeaders(options);

    let response: OpenAIResponse;
    try {
      const result = await postJsonToApi({
        url: `${this.config.baseURL}/chat/completions`,
        headers,
        body: args,
        failedResponseHandler: createStatusCodeErrorResponseHandler(),
        successfulResponseHandler:
          createJsonResponseHandler(openAIResponseSchema),
        abortSignal: options.abortSignal,
      });
      response = result.value;
    } catch (error) {
      this.handleApiError(error);
    }

    const choice = response.choices[0];

    const content: LanguageModelV3Content[] = [];

    if (choice.message.content) {
      content.push({
        type: 'text',
        text: choice.message.content,
      });
    }

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

    const finishReason: LanguageModelV3FinishReason =
      mapOpenAIFinishReasonV3(choice.finish_reason);

    return {
      content,
      finishReason,
      usage: buildV3Usage(
        response.usage?.prompt_tokens,
        response.usage?.completion_tokens
      ),
      request: {body: args},
      response: {
        headers: {},
        body: response,
      },
      warnings,
    };
  }

  async doStream(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3StreamResult> {
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
        successfulResponseHandler:
          createEventSourceResponseHandler(openAIStreamChunkSchema),
        abortSignal: options.abortSignal,
      });
      response = result.value as ReadableStream<
        ParseResult<OpenAIStreamChunk>
      >;
    } catch (error) {
      this.handleApiError(error);
    }

    let finishReason: LanguageModelV3FinishReason = {
      unified: 'other',
      raw: undefined,
    };
    let usage: LanguageModelV3Usage = buildV3Usage(undefined, undefined);

    const toolCallDeltas: Record<
      number,
      {
        id: string;
        name: string;
        input: string;
      }
    > = {};

    let currentTextId = '';

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<OpenAIStreamChunk>,
          LanguageModelV3StreamPart
        >({
          start(controller) {
            controller.enqueue({
              type: 'stream-start',
              warnings,
            });
          },

          transform(chunk, controller) {
            if (!chunk.success) {
              controller.enqueue({type: 'error', error: chunk.error});
              return;
            }

            const data =
              chunk.value ?? (chunk.rawValue as OpenAIStreamChunk);

            if (!data || data === '[DONE]') {
              return;
            }

            try {
              if (
                typeof data === 'object' &&
                'choices' in data &&
                data.choices &&
                data.choices.length > 0
              ) {
                const delta = data.choices[0].delta;

                if (
                  'content' in delta &&
                  delta.content !== null &&
                  delta.content !== undefined
                ) {
                  if (!currentTextId) {
                    currentTextId = `text-${Date.now()}`;
                    controller.enqueue({
                      type: 'text-start',
                      id: currentTextId,
                    });
                  }
                  if (delta.content !== '') {
                    controller.enqueue({
                      type: 'text-delta',
                      id: currentTextId,
                      delta: delta.content,
                    });
                  }
                }

                if (delta.tool_calls) {
                  for (const toolCall of delta.tool_calls) {
                    const index = toolCall.index;

                    if (!toolCallDeltas[index]) {
                      const id =
                        toolCall.id || `tool-${Date.now()}-${index}`;
                      toolCallDeltas[index] = {
                        id,
                        name: toolCall.function?.name || '',
                        input: '',
                      };

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
                      toolCallDeltas[index].input +=
                        toolCall.function.arguments;

                      controller.enqueue({
                        type: 'tool-input-delta',
                        id: toolCallDeltas[index].id,
                        delta: toolCall.function.arguments,
                      });
                    }
                  }
                }

                if (data.choices[0].finish_reason) {
                  finishReason = mapOpenAIFinishReasonV3(
                    data.choices[0].finish_reason
                  );
                }
              }

              if (
                typeof data === 'object' &&
                'usage' in data &&
                data.usage
              ) {
                usage = buildV3Usage(
                  data.usage.prompt_tokens,
                  data.usage.completion_tokens
                );
              }
            } catch (error) {
              controller.enqueue({
                type: 'error',
                error: error,
              });
            }
          },

          flush(controller) {
            if (currentTextId) {
              controller.enqueue({
                type: 'text-end',
                id: currentTextId,
              });
            }

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
    };
  }
}

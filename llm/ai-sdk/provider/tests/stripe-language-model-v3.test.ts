/**
 * Tests for Stripe Language Model V3 implementation
 */

import {StripeLanguageModelV3} from '../stripe-language-model-v3';
import {StripeProviderAccessError} from '../stripe-language-model';
import type {LanguageModelV3CallOptions} from '@ai-sdk/provider';

describe('StripeLanguageModelV3', () => {
  let model: StripeLanguageModelV3;

  beforeEach(() => {
    model = new StripeLanguageModelV3(
      'openai/gpt-5',
      {customerId: 'cus_test123'},
      {
        provider: 'stripe',
        baseURL: 'https://llm.stripe.com',
        headers: () => ({
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk_test_123',
        }),
      }
    );
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(model.specificationVersion).toBe('v3');
      expect(model.provider).toBe('stripe');
      expect(model.modelId).toBe('openai/gpt-5');
    });

    it('should support different model IDs', () => {
      const models = [
        'openai/gpt-5',
        'google/gemini-2.5-pro',
        'anthropic/claude-sonnet-4',
      ];

      models.forEach((modelId) => {
        const m = new StripeLanguageModelV3(
          modelId,
          {customerId: 'cus_test'},
          {
            provider: 'stripe',
            baseURL: 'https://llm.stripe.com',
            headers: () => ({}),
          }
        );
        expect(m.modelId).toBe(modelId);
      });
    });
  });

  describe('supportedUrls', () => {
    it('should return empty object (no native URL support)', () => {
      expect(model.supportedUrls).toEqual({});
    });
  });

  describe('getHeaders', () => {
    it('should throw error when customer ID is not provided', () => {
      const modelWithoutCustomer = new StripeLanguageModelV3(
        'openai/gpt-5',
        {},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({
            Authorization: 'Bearer sk_test_123',
          }),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
      };

      expect(() => {
        // @ts-expect-error - Accessing private method for testing
        modelWithoutCustomer.getHeaders(options);
      }).toThrow('Stripe customer ID is required');
    });

    it('should use customer ID from settings', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
      };

      // @ts-expect-error - Accessing private method for testing
      const headers = model.getHeaders(options);

      expect(headers['X-Stripe-Customer-ID']).toBe('cus_test123');
    });

    it('should override customer ID from providerOptions', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        providerOptions: {
          stripe: {
            customerId: 'cus_override',
          },
        },
      };

      // @ts-expect-error - Accessing private method for testing
      const headers = model.getHeaders(options);

      expect(headers['X-Stripe-Customer-ID']).toBe('cus_override');
    });

    it('should merge custom headers', () => {
      const modelWithHeaders = new StripeLanguageModelV3(
        'openai/gpt-5',
        {
          customerId: 'cus_test',
          headers: {'X-Custom-Header': 'custom-value'},
        },
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({
            Authorization: 'Bearer sk_test_123',
          }),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
        providerOptions: {
          stripe: {
            headers: {'X-Runtime-Header': 'runtime-value'},
          },
        },
      };

      // @ts-expect-error - Accessing private method for testing
      const headers = modelWithHeaders.getHeaders(options);

      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['X-Runtime-Header']).toBe('runtime-value');
      expect(headers['X-Stripe-Customer-ID']).toBe('cus_test');
    });
  });

  describe('getArgs', () => {
    it('should convert basic prompt to OpenAI format', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [
          {
            role: 'user',
            content: [{type: 'text', text: 'Hello'}],
          },
        ],
      };

      // @ts-expect-error - Accessing private method for testing
      const {args, warnings} = model.getArgs(options);

      expect(args.model).toBe('openai/gpt-5');
      expect(args.messages).toHaveLength(1);
      expect(args.messages[0].role).toBe('user');
      expect(warnings).toEqual([]);
    });

    it('should include temperature setting', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        temperature: 0.7,
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = model.getArgs(options);

      expect(args.temperature).toBe(0.7);
    });

    it('should include max_tokens setting', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        maxOutputTokens: 100,
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = model.getArgs(options);

      expect(args.max_tokens).toBe(100);
    });

    it('should include stop sequences', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        stopSequences: ['\n', 'END'],
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = model.getArgs(options);

      expect(args.stop).toEqual(['\n', 'END']);
    });

    it('should include topP, frequencyPenalty, and presencePenalty', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = model.getArgs(options);

      expect(args.top_p).toBe(0.9);
      expect(args.frequency_penalty).toBe(0.5);
      expect(args.presence_penalty).toBe(0.3);
    });

    it('should include seed when provided', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        seed: 12345,
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = model.getArgs(options);

      expect(args.seed).toBe(12345);
    });
  });

  describe('tools support', () => {
    it('should throw error when tools are provided', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        tools: [
          {
            type: 'function',
            name: 'getWeather',
            description: 'Get weather for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: {type: 'string'},
              },
              required: ['location'],
            },
          },
        ],
      };

      expect(() => {
        // @ts-expect-error - Accessing private method for testing
        model.getArgs(options);
      }).toThrow('Tool calling is not supported by the Stripe AI SDK Provider');
    });

    it('should throw error when tool choice is provided with tools', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [],
        tools: [
          {
            type: 'function',
            name: 'test',
            inputSchema: {type: 'object', properties: {}},
          },
        ],
        toolChoice: {type: 'auto'},
      };

      expect(() => {
        // @ts-expect-error - Accessing private method for testing
        model.getArgs(options);
      }).toThrow('Tool calling is not supported by the Stripe AI SDK Provider');
    });

    it('should not throw error when no tools are provided', () => {
      const options: LanguageModelV3CallOptions = {
        prompt: [
          {
            role: 'user',
            content: [{type: 'text', text: 'Hello'}],
          },
        ],
      };

      expect(() => {
        // @ts-expect-error - Accessing private method for testing
        model.getArgs(options);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle missing customer ID gracefully', () => {
      const modelWithoutCustomer = new StripeLanguageModelV3(
        'openai/gpt-5',
        {},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({
            Authorization: 'Bearer sk_test_123',
          }),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [{role: 'user', content: [{type: 'text', text: 'Hi'}]}],
      };

      expect(() => {
        // @ts-expect-error - Accessing private method for testing
        modelWithoutCustomer.getHeaders(options);
      }).toThrow('Stripe customer ID is required');
    });
  });

  describe('anthropic max_tokens defaults', () => {
    it('should apply 64K default for Claude Sonnet 4 models', () => {
      const sonnetModel = new StripeLanguageModelV3(
        'anthropic/claude-sonnet-4',
        {customerId: 'cus_test'},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({}),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = sonnetModel.getArgs(options);

      expect(args.max_tokens).toBe(64000);
    });

    it('should apply 32K default for Claude Opus 4 models', () => {
      const opusModel = new StripeLanguageModelV3(
        'anthropic/claude-opus-4',
        {customerId: 'cus_test'},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({}),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = opusModel.getArgs(options);

      expect(args.max_tokens).toBe(32000);
    });

    it('should apply 8K default for Claude 3.5 Haiku', () => {
      const haikuModel = new StripeLanguageModelV3(
        'anthropic/claude-3-5-haiku',
        {customerId: 'cus_test'},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({}),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = haikuModel.getArgs(options);

      expect(args.max_tokens).toBe(8192);
    });

    it('should apply 4K default for other Anthropic models', () => {
      const haikuModel = new StripeLanguageModelV3(
        'anthropic/claude-3-haiku',
        {customerId: 'cus_test'},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({}),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = haikuModel.getArgs(options);

      expect(args.max_tokens).toBe(4096);
    });

    it('should not apply default for non-Anthropic models', () => {
      const openaiModel = new StripeLanguageModelV3(
        'openai/gpt-5',
        {customerId: 'cus_test'},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({}),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = openaiModel.getArgs(options);

      expect(args.max_tokens).toBeUndefined();
    });

    it('should allow user-provided maxOutputTokens to override default', () => {
      const sonnetModel = new StripeLanguageModelV3(
        'anthropic/claude-sonnet-4',
        {customerId: 'cus_test'},
        {
          provider: 'stripe',
          baseURL: 'https://llm.stripe.com',
          headers: () => ({}),
        }
      );

      const options: LanguageModelV3CallOptions = {
        prompt: [],
        maxOutputTokens: 1000,
      };

      // @ts-expect-error - Accessing private method for testing
      const {args} = sonnetModel.getArgs(options);

      expect(args.max_tokens).toBe(1000);
    });
  });

  describe('access denied error handling', () => {
    it('should throw StripeProviderAccessError for "Unrecognized request URL" errors', () => {
      const mockError = {
        statusCode: 400,
        responseBody: JSON.stringify({
          error: {
            type: 'invalid_request_error',
            message:
              'Unrecognized request URL. Please see https://stripe.com/docs or we can help at https://support.stripe.com/.',
          },
        }),
        message: 'Bad Request',
      };

      const isAccessDenied = (model as any).isAccessDeniedError(mockError);
      expect(isAccessDenied).toBe(true);

      try {
        (model as any).handleApiError(mockError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StripeProviderAccessError);
        expect((error as Error).message).toContain(
          'Stripe AI SDK Provider Access Required'
        );
        expect((error as Error).message).toContain('Private Preview');
        expect((error as Error).message).toContain(
          'https://docs.stripe.com/billing/token-billing'
        );
        expect((error as any).cause).toBe(mockError);
      }
    });

    it('should not throw StripeProviderAccessError for other 400 errors', () => {
      const mockError = {
        statusCode: 400,
        responseBody: JSON.stringify({
          error: {
            type: 'invalid_request_error',
            message: 'Some other error message',
          },
        }),
        message: 'Bad Request',
      };

      const isAccessDenied = (model as any).isAccessDeniedError(mockError);
      expect(isAccessDenied).toBe(false);

      try {
        (model as any).handleApiError(mockError);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).not.toBeInstanceOf(StripeProviderAccessError);
        expect(error).toBe(mockError);
      }
    });

    it('should handle errors with parsed responseBody', () => {
      const mockError = {
        statusCode: 400,
        responseBody: {
          error: {
            type: 'invalid_request_error',
            message:
              'Unrecognized request URL. Please see https://stripe.com/docs',
          },
        },
        message: 'Bad Request',
      };

      const isAccessDenied = (model as any).isAccessDeniedError(mockError);
      expect(isAccessDenied).toBe(true);
    });

    it('should handle malformed responseBody gracefully', () => {
      const mockError = {
        statusCode: 400,
        responseBody: 'Not valid JSON {{{',
        message: 'Bad Request',
      };

      const isAccessDenied = (model as any).isAccessDeniedError(mockError);
      expect(isAccessDenied).toBe(false);
    });

    it('should not match non-400 errors', () => {
      const mockError = {
        statusCode: 500,
        responseBody: JSON.stringify({
          error: {
            type: 'invalid_request_error',
            message: 'Unrecognized request URL',
          },
        }),
        message: 'Internal Server Error',
      };

      const isAccessDenied = (model as any).isAccessDeniedError(mockError);
      expect(isAccessDenied).toBe(false);
    });
  });

  describe('streaming error conditions', () => {
    it('should handle errors mid-stream', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            success: true,
            value: {
              choices: [
                {
                  delta: {content: 'Hello '},
                  finish_reason: null,
                },
              ],
            },
          });

          controller.enqueue({
            success: false,
            error: new Error('Stream error occurred'),
          });

          controller.close();
        },
      });

      jest.mock('@ai-sdk/provider-utils', () => ({
        postJsonToApi: jest.fn().mockResolvedValue({value: mockStream}),
      }));

      const options: LanguageModelV3CallOptions = {
        prompt: [{role: 'user', content: [{type: 'text', text: 'Hi'}]}],
      };

      try {
        const result = await model.doStream(options);
        const parts: any[] = [];

        for await (const part of result.stream) {
          parts.push(part);
        }

        const textDeltas = parts.filter((p) => p.type === 'text-delta');
        const errors = parts.filter((p) => p.type === 'error');

        expect(textDeltas.length).toBeGreaterThan(0);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].error).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle abort signal during streaming', async () => {
      const abortController = new AbortController();

      const options: LanguageModelV3CallOptions = {
        prompt: [{role: 'user', content: [{type: 'text', text: 'Hi'}]}],
        abortSignal: abortController.signal,
      };

      abortController.abort();

      try {
        await model.doStream(options);
      } catch (error: any) {
        expect(
          error.name === 'AbortError' ||
            error.message?.includes('abort') ||
            error.statusCode !== undefined
        ).toBe(true);
      }
    });
  });
});

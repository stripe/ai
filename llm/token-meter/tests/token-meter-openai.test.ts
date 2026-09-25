/**
 * Tests for TokenMeter - OpenAI Provider
 */

import Stripe from 'stripe';
import {Stream as OpenAIStream} from 'openai/streaming';
import {createTokenMeter} from '../token-meter';
import type {MeterConfig} from '../types';

// Mock Stripe
jest.mock('stripe');

describe('TokenMeter - OpenAI Provider', () => {
  let mockMeterEventsCreate: jest.Mock;
  let config: MeterConfig;
  const TEST_API_KEY = 'sk_test_mock_key';

  beforeEach(() => {
    jest.clearAllMocks();
    mockMeterEventsCreate = jest.fn().mockResolvedValue({});
    
    // Mock the Stripe constructor
    (Stripe as unknown as jest.Mock).mockImplementation(() => ({
      v2: {
        billing: {
          meterEvents: {
            create: mockMeterEventsCreate,
          },
        },
      },
    }));
    
    config = {};
  });

  describe('Chat Completions - Non-streaming', () => {
    it('should track usage from basic chat completion', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello, World!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 5,
          total_tokens: 17,
        },
      };

      meter.trackUsage(response as any, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: 'token-billing-tokens',
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_123',
            value: '12',
            model: 'openai/gpt-4o-mini',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '5',
            token_type: 'output',
          }),
        })
      );
    });

    it('should track usage from chat completion with tools', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location":"San Francisco"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 30,
          total_tokens: 130,
        },
      };

      meter.trackUsage(response as any, 'cus_456');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_456',
            value: '100',
            model: 'openai/gpt-4o',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '30',
            token_type: 'output',
          }),
        })
      );
    });

    it('should handle missing usage data', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello!',
            },
            finish_reason: 'stop',
          },
        ],
      };

      meter.trackUsage(response as any, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      // Should not create events with 0 tokens (code only sends when > 0)
      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(0);
    });

    it('should handle multi-turn conversations', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'chatcmpl-789',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'The weather is sunny.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150, // Includes conversation history
          completion_tokens: 10,
          total_tokens: 160,
        },
      };

      meter.trackUsage(response as any, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '150',
            model: 'openai/gpt-4',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '10',
            token_type: 'output',
          }),
        })
      );
    });
  });

  describe('Chat Completions - Streaming', () => {
    it('does not consume the source before the returned stream is read', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);
      let pulls = 0;

      async function* chunks() {
        pulls += 1;
        yield {
          id: 'chatcmpl-lazy',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4o-mini',
          choices: [],
        };
      }

      const source = new OpenAIStream(chunks, new AbortController());
      const wrapped = meter.trackUsageStreamOpenAI(source as any, 'cus_123');

      await new Promise(resolve => setImmediate(resolve));

      expect(pulls).toBe(0);
      expect(wrapped).toBeInstanceOf(OpenAIStream);
    });

    it('closes the source when the returned stream is abandoned', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);
      let finalized = false;
      let release!: () => void;
      const blocked = new Promise<void>(resolve => {
        release = resolve;
      });

      async function* chunks() {
        try {
          yield {
            id: 'chatcmpl-cancel',
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: 'gpt-4o-mini',
            choices: [],
          };
          await blocked;
          yield {
            id: 'chatcmpl-unused',
            object: 'chat.completion.chunk',
            created: Date.now(),
            model: 'gpt-4o-mini',
            choices: [],
          };
        } finally {
          finalized = true;
        }
      }

      const source = new OpenAIStream(chunks, new AbortController());
      const wrapped = meter.trackUsageStreamOpenAI(source as any, 'cus_123');

      try {
        for await (const _chunk of wrapped) {
          break;
        }
        await new Promise(resolve => setImmediate(resolve));

        expect(finalized).toBe(true);
      } finally {
        release();
      }
    });

    it('propagates a source error once and finalizes the source', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);
      const sourceError = new Error('source failed before the first chunk');
      let finalized = false;

      async function* chunks(): AsyncGenerator<any> {
        try {
          throw sourceError;
        } finally {
          finalized = true;
        }
      }

      const source = new OpenAIStream(chunks, new AbortController());
      const wrapped = meter.trackUsageStreamOpenAI(source as any, 'cus_123');
      const iterator = wrapped[Symbol.asyncIterator]();

      await expect(iterator.next()).rejects.toBe(sourceError);
      await expect(iterator.next()).resolves.toEqual({done: true, value: undefined});
      await new Promise(resolve => setImmediate(resolve));

      expect(finalized).toBe(true);
    });

    it('should track usage from basic streaming chat', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              delta: {content: 'Hello'},
              finish_reason: null,
            },
          ],
        },
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4o-mini',
          choices: [
            {
              index: 0,
              delta: {content: ', World!'},
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 5,
            total_tokens: 17,
          },
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamOpenAI(mockStream as any, 'cus_123');

      for await (const _chunk of wrappedStream) {
        // Consume stream
      }

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_123',
            value: '12',
            model: 'openai/gpt-4o-mini',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '5',
            token_type: 'output',
          }),
        })
      );
    });

    it('should track usage from streaming chat with tools', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4o',
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'get_weather',
                      arguments: '{"location":',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        },
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4o',
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'tool_calls',
            },
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 30,
            total_tokens: 130,
          },
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamOpenAI(mockStream as any, 'cus_456');

      for await (const _chunk of wrappedStream) {
        // Consume stream
      }

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_456',
            value: '100',
            model: 'openai/gpt-4o',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '30',
            token_type: 'output',
          }),
        })
      );
    });

    it('should properly tee the stream', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              delta: {content: 'Hello'},
              finish_reason: null,
            },
          ],
        },
        {
          id: 'chatcmpl-123',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              delta: {content: ' world'},
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamOpenAI(mockStream as any, 'cus_123');

      const receivedChunks: any[] = [];
      for await (const chunk of wrappedStream) {
        receivedChunks.push(chunk);
      }

      expect(receivedChunks).toHaveLength(2);
      expect(receivedChunks[0].choices[0].delta.content).toBe('Hello');
      expect(receivedChunks[1].choices[0].delta.content).toBe(' world');
    });
  });

  describe('Responses API - Non-streaming', () => {
    it('should track usage from basic responses API', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'resp_123',
        object: 'response',
        created: Date.now(),
        model: 'gpt-4o-mini',
        output: 'Hello, World!',
        usage: {
          input_tokens: 15,
          output_tokens: 8,
        },
      };

      meter.trackUsage(response as any, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_123',
            value: '15',
            model: 'openai/gpt-4o-mini',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '8',
            token_type: 'output',
          }),
        })
      );
    });

    it('should track usage from responses API parse', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'resp_456',
        object: 'response',
        created: Date.now(),
        model: 'gpt-4o',
        output: {parsed: {city: 'San Francisco', temperature: 72}},
        usage: {
          input_tokens: 50,
          output_tokens: 20,
        },
      };

      meter.trackUsage(response as any, 'cus_789');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_789',
            value: '50',
            model: 'openai/gpt-4o',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '20',
            token_type: 'output',
          }),
        })
      );
    });
  });

  describe('Responses API - Streaming', () => {
    it('should track usage from streaming responses API', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          type: 'response.output_text.delta',
          delta: 'Hello',
        },
        {
          type: 'response.output_text.delta',
          delta: ', World!',
        },
        {
          type: 'response.done',
          response: {
            id: 'resp_123',
            model: 'gpt-4o-mini',
            usage: {
              input_tokens: 15,
              output_tokens: 8,
            },
          },
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamOpenAI(mockStream as any, 'cus_123');

      for await (const _chunk of wrappedStream) {
        // Consume stream
      }

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_123',
            value: '15',
            model: 'openai/gpt-4o-mini',
            token_type: 'input',
          }),
        })
      );
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '8',
            token_type: 'output',
          }),
        })
      );
    });
  });

  describe('Embeddings', () => {
    it('should track usage from single text embedding', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: new Array(1536).fill(0.1),
            index: 0,
          },
        ],
        model: 'text-embedding-ada-002',
        usage: {
          prompt_tokens: 8,
          total_tokens: 8,
        },
      };

      meter.trackUsage(response as any, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      // Embeddings only have input tokens, no output tokens
      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(1);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_123',
            value: '8',
            model: 'openai/text-embedding-ada-002',
            token_type: 'input',
          }),
        })
      );
    });

    it('should track usage from batch embeddings', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: new Array(1536).fill(0.1),
            index: 0,
          },
          {
            object: 'embedding',
            embedding: new Array(1536).fill(0.2),
            index: 1,
          },
          {
            object: 'embedding',
            embedding: new Array(1536).fill(0.3),
            index: 2,
          },
        ],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 24,
          total_tokens: 24,
        },
      };

      meter.trackUsage(response as any, 'cus_456');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      // Embeddings only have input tokens, no output tokens
      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(1);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_456',
            value: '24',
            model: 'openai/text-embedding-3-small',
            token_type: 'input',
          }),
        })
      );
    });

    it('should handle missing usage data in embeddings', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: new Array(1536).fill(0.1),
            index: 0,
          },
        ],
        model: 'text-embedding-ada-002',
      };

      meter.trackUsage(response as any, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      // Should not create events with 0 tokens
      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(0);
    });
  });
});

// Helper function to create mock streams with tee()
function createMockStreamWithTee(chunks: any[]) {
  return {
    tee() {
      const stream1 = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
        tee() {
          const s1 = {
            async *[Symbol.asyncIterator]() {
              for (const chunk of chunks) {
                yield chunk;
              }
            },
          };
          const s2 = {
            async *[Symbol.asyncIterator]() {
              for (const chunk of chunks) {
                yield chunk;
              }
            },
          };
          return [s1, s2];
        },
      };
      const stream2 = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      };
      return [stream1, stream2];
    },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}


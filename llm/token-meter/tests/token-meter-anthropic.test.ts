/**
 * Tests for TokenMeter - Anthropic Provider
 */

import Stripe from 'stripe';
import {Stream as AnthropicStream} from '@anthropic-ai/sdk/streaming';
import {createTokenMeter} from '../token-meter';
import type {MeterConfig} from '../types';

// Mock Stripe
jest.mock('stripe');

describe('TokenMeter - Anthropic Provider', () => {
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

  describe('Messages - Non-streaming', () => {
    it('should track usage from basic message', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{type: 'text', text: 'Hello, World!'}],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 15,
          output_tokens: 8,
        },
      };

      meter.trackUsage(response, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: 'token-billing-tokens',
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_123',
            value: '15',
            model: 'anthropic/claude-3.5-sonnet',
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

    it('should track usage from message with system prompt', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'msg_456',
        type: 'message',
        role: 'assistant',
        content: [{type: 'text', text: 'I am a helpful assistant.'}],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 50,
          output_tokens: 12,
        },
      };

      meter.trackUsage(response, 'cus_456');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            stripe_customer_id: 'cus_456',
            value: '50',
            model: 'anthropic/claude-3.5-sonnet',
            token_type: 'input',
          }),
        })
      );
    });

    it('should track usage from message with tool use', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'msg_789',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_123',
            name: 'get_weather',
            input: {location: 'San Francisco'},
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 45,
        },
      };

      meter.trackUsage(response, 'cus_789');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '100',
            model: 'anthropic/claude-3.5-sonnet',
            token_type: 'input',
          }),
        })
      );
    });

    it('should track usage from multi-turn conversation', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'msg_conv',
        type: 'message',
        role: 'assistant',
        content: [{type: 'text', text: 'The weather is sunny today.'}],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 200, // Includes conversation history
          output_tokens: 15,
        },
      };

      meter.trackUsage(response, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '200',
            model: 'anthropic/claude-3-opus',
            token_type: 'input',
          }),
        })
      );
    });

    it('should track usage from message with mixed content', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'msg_mixed',
        type: 'message',
        role: 'assistant',
        content: [
          {type: 'text', text: 'Let me check the weather for you.'},
          {
            type: 'tool_use',
            id: 'toolu_456',
            name: 'get_weather',
            input: {location: 'New York'},
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: {
          input_tokens: 80,
          output_tokens: 60,
        },
      };

      meter.trackUsage(response, 'cus_999');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '80',
            model: 'anthropic/claude-3.5-haiku',
            token_type: 'input',
          }),
        })
      );
    });
  });

  describe('Messages - Streaming', () => {
    it('does not consume the source before the returned stream is read', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);
      let pulls = 0;

      async function* chunks() {
        pulls += 1;
        yield {
          type: 'message_start',
          message: {
            id: 'msg_lazy',
            model: 'claude-3-5-sonnet-20241022',
            usage: {input_tokens: 10, output_tokens: 0},
          },
        };
      }

      const source = new AnthropicStream(chunks, new AbortController());
      const wrapped = meter.trackUsageStreamAnthropic(source as any, 'cus_123');

      await new Promise(resolve => setImmediate(resolve));

      expect(pulls).toBe(0);
      expect(wrapped).toBeInstanceOf(AnthropicStream);
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
            type: 'message_start',
            message: {
              id: 'msg_cancel',
              model: 'claude-3-5-sonnet-20241022',
              usage: {input_tokens: 10, output_tokens: 0},
            },
          };
          await blocked;
          yield {type: 'message_stop'};
        } finally {
          finalized = true;
        }
      }

      const source = new AnthropicStream(chunks, new AbortController());
      const wrapped = meter.trackUsageStreamAnthropic(source as any, 'cus_123');

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

    it('should track usage from basic streaming message', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          type: 'message_start',
          message: {
            id: 'msg_123',
            type: 'message',
            role: 'assistant',
            content: [],
            model: 'claude-3-5-sonnet-20241022',
            usage: {
              input_tokens: 15,
              output_tokens: 0,
            },
          },
        },
        {
          type: 'content_block_start',
          index: 0,
          content_block: {type: 'text', text: ''},
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: {type: 'text_delta', text: 'Hello, World!'},
        },
        {
          type: 'content_block_stop',
          index: 0,
        },
        {
          type: 'message_delta',
          delta: {stop_reason: 'end_turn'},
          usage: {
            output_tokens: 8,
          },
        },
        {
          type: 'message_stop',
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamAnthropic(mockStream, 'cus_123');

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
            model: 'anthropic/claude-3.5-sonnet',
            token_type: 'input',
          }),
        })
      );
    });

    it('should track usage from streaming message with tool use', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          type: 'message_start',
          message: {
            id: 'msg_456',
            type: 'message',
            role: 'assistant',
            content: [],
            model: 'claude-3-5-sonnet-20241022',
            usage: {
              input_tokens: 100,
              output_tokens: 0,
            },
          },
        },
        {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'toolu_789',
            name: 'get_weather',
            input: {},
          },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: {
            type: 'input_json_delta',
            partial_json: '{"location": "San Francisco"}',
          },
        },
        {
          type: 'content_block_stop',
          index: 0,
        },
        {
          type: 'message_delta',
          delta: {stop_reason: 'tool_use'},
          usage: {
            output_tokens: 45,
          },
        },
        {
          type: 'message_stop',
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamAnthropic(mockStream, 'cus_456');

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
            model: 'anthropic/claude-3.5-sonnet',
            token_type: 'input',
          }),
        })
      );
    });

    it('should properly tee the stream', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          type: 'message_start',
          message: {
            id: 'msg_123',
            usage: {
              input_tokens: 10,
              output_tokens: 0,
            },
          },
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: {type: 'text_delta', text: 'Hello'},
        },
        {
          type: 'content_block_delta',
          index: 0,
          delta: {type: 'text_delta', text: ' World'},
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamAnthropic(mockStream, 'cus_123');

      const receivedChunks: any[] = [];
      for await (const chunk of wrappedStream) {
        receivedChunks.push(chunk);
      }

      expect(receivedChunks).toHaveLength(3);
      expect(receivedChunks[0].type).toBe('message_start');
      expect(receivedChunks[1].delta.text).toBe('Hello');
      expect(receivedChunks[2].delta.text).toBe(' World');
    });

    it('should extract input tokens from message_start', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const chunks = [
        {
          type: 'message_start',
          message: {
            id: 'msg_123',
            model: 'claude-3-opus-20240229',
            usage: {
              input_tokens: 250,
              output_tokens: 0,
            },
          },
        },
        {
          type: 'message_delta',
          delta: {stop_reason: 'end_turn'},
          usage: {
            output_tokens: 20,
          },
        },
      ];

      const mockStream = createMockStreamWithTee(chunks);
      const wrappedStream = meter.trackUsageStreamAnthropic(mockStream, 'cus_789');

      for await (const _chunk of wrappedStream) {
        // Consume stream
      }

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '250',
            model: 'anthropic/claude-3-opus',
            token_type: 'input',
          }),
        })
      );
    });
  });

  describe('Model Variants', () => {
    it('should track claude-3-opus', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'msg_opus',
        type: 'message',
        role: 'assistant',
        content: [{type: 'text', text: 'Response from Opus'}],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 20,
          output_tokens: 10,
        },
      };

      meter.trackUsage(response, 'cus_123');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '20',
            model: 'anthropic/claude-3-opus',
            token_type: 'input',
          }),
        })
      );
    });

    it('should track claude-3-5-haiku', async () => {
      const meter = createTokenMeter(TEST_API_KEY, config);

      const response = {
        id: 'msg_haiku',
        type: 'message',
        role: 'assistant',
        content: [{type: 'text', text: 'Response from Haiku'}],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 15,
          output_tokens: 8,
        },
      };

      meter.trackUsage(response, 'cus_456');

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '15',
            model: 'anthropic/claude-3.5-haiku',
            token_type: 'input',
          }),
        })
      );
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


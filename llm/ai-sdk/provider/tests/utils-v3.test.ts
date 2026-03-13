/**
 * Tests for Stripe Provider V3 Utils
 */

import {convertToOpenAIMessagesV3, mapOpenAIFinishReasonV3} from '../utils-v3';
import type {LanguageModelV3Prompt} from '@ai-sdk/provider';

describe('Stripe Provider V3 Utils', () => {
  describe('convertToOpenAIMessagesV3', () => {
    it('should convert system message', () => {
      const prompt: LanguageModelV3Prompt = [
        {role: 'system', content: 'You are a helpful assistant'},
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result).toEqual([
        {role: 'system', content: 'You are a helpful assistant'},
      ]);
    });

    it('should convert user text message', () => {
      const prompt: LanguageModelV3Prompt = [
        {role: 'user', content: [{type: 'text', text: 'Hello'}]},
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result).toEqual([{role: 'user', content: 'Hello'}]);
    });

    it('should convert user message with file URL', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'user',
          content: [
            {type: 'text', text: 'Describe this image'},
            {
              type: 'file',
              data: 'https://example.com/image.jpg',
              mediaType: 'image/jpeg',
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result).toEqual([
        {
          role: 'user',
          content: [
            {type: 'text', text: 'Describe this image'},
            {
              type: 'image_url',
              image_url: {url: 'https://example.com/image.jpg'},
            },
          ],
        },
      ]);
    });

    it('should convert user message with file Uint8Array to base64', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]);
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data,
              mediaType: 'image/png',
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result[0].content).toEqual([
        {
          type: 'image_url',
          image_url: {url: expect.stringContaining('data:image/png;base64,')},
        },
      ]);
    });

    it('should convert assistant message with text', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'assistant',
          content: [{type: 'text', text: 'Hello there!'}],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result).toEqual([
        {role: 'assistant', content: 'Hello there!', tool_calls: undefined},
      ]);
    });

    it('should convert assistant message with tool calls', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'getWeather',
              input: {location: 'NYC'},
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result[0].tool_calls).toEqual([
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'getWeather',
            arguments: '{"location":"NYC"}',
          },
        },
      ]);
    });

    it('should convert assistant message with text and tool calls', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'assistant',
          content: [
            {type: 'text', text: 'Let me check.'},
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'search',
              input: {query: 'test'},
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result[0].content).toBe('Let me check.');
      expect(result[0].tool_calls).toHaveLength(1);
    });

    it('should convert tool message', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_1',
              toolName: 'getWeather',
              output: {type: 'text', value: 'Sunny, 72°F'},
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result).toEqual([
        {
          role: 'tool',
          tool_call_id: 'call_1',
          name: 'getWeather',
          content: 'Sunny, 72°F',
        },
      ]);
    });

    it('should handle string tool call args', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'test',
              input: '{"key": "value"}',
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result[0].tool_calls![0].function.arguments).toBe(
        '{"key": "value"}'
      );
    });

    it('should handle string tool result', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_1',
              toolName: 'test',
              output: {type: 'json', value: {result: 42}},
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result[0].content).toBe('{"result":42}');
    });

    it('should convert multiple messages', () => {
      const prompt: LanguageModelV3Prompt = [
        {role: 'system', content: 'System prompt'},
        {role: 'user', content: [{type: 'text', text: 'Hi'}]},
        {
          role: 'assistant',
          content: [{type: 'text', text: 'Hello!'}],
        },
        {role: 'user', content: [{type: 'text', text: 'How are you?'}]},
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result).toHaveLength(4);
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('user');
      expect(result[2].role).toBe('assistant');
      expect(result[3].role).toBe('user');
    });

    it('should throw error for unsupported message role', () => {
      const prompt = [
        {role: 'custom', content: 'test'},
      ] as any;

      expect(() => convertToOpenAIMessagesV3(prompt)).toThrow(
        'Unsupported message role'
      );
    });

    it('should throw error for unsupported part type', () => {
      const prompt = [
        {role: 'user', content: [{type: 'unknown', text: 'test'}]},
      ] as any;

      expect(() => convertToOpenAIMessagesV3(prompt)).toThrow(
        'Unsupported user message part type'
      );
    });

    it('should handle tool-approval-response parts in tool messages by filtering them', () => {
      const prompt: LanguageModelV3Prompt = [
        {
          role: 'tool',
          content: [
            {
              type: 'tool-approval-response',
              toolCallId: 'call_1',
              approved: true,
            } as any,
            {
              type: 'tool-result',
              toolCallId: 'call_2',
              toolName: 'test',
              output: {type: 'text', value: 'result'},
            },
          ],
        },
      ];

      const result = convertToOpenAIMessagesV3(prompt);

      expect(result).toHaveLength(1);
      expect(result[0].tool_call_id).toBe('call_2');
    });
  });

  describe('mapOpenAIFinishReasonV3', () => {
    it('should map "stop" to unified "stop"', () => {
      const result = mapOpenAIFinishReasonV3('stop');
      expect(result).toEqual({unified: 'stop', raw: 'stop'});
    });

    it('should map "length" to unified "length"', () => {
      const result = mapOpenAIFinishReasonV3('length');
      expect(result).toEqual({unified: 'length', raw: 'length'});
    });

    it('should map "content_filter" to unified "content-filter"', () => {
      const result = mapOpenAIFinishReasonV3('content_filter');
      expect(result).toEqual({
        unified: 'content-filter',
        raw: 'content_filter',
      });
    });

    it('should map "tool_calls" to unified "tool-calls"', () => {
      const result = mapOpenAIFinishReasonV3('tool_calls');
      expect(result).toEqual({unified: 'tool-calls', raw: 'tool_calls'});
    });

    it('should map "function_call" to unified "tool-calls"', () => {
      const result = mapOpenAIFinishReasonV3('function_call');
      expect(result).toEqual({
        unified: 'tool-calls',
        raw: 'function_call',
      });
    });

    it('should map null to unified "other" with undefined raw', () => {
      const result = mapOpenAIFinishReasonV3(null);
      expect(result).toEqual({unified: 'other', raw: undefined});
    });

    it('should map undefined to unified "other" with undefined raw', () => {
      const result = mapOpenAIFinishReasonV3(undefined);
      expect(result).toEqual({unified: 'other', raw: undefined});
    });

    it('should map unknown reason to unified "other"', () => {
      const result = mapOpenAIFinishReasonV3('custom_reason');
      expect(result).toEqual({unified: 'other', raw: 'custom_reason'});
    });
  });
});

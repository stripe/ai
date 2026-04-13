/**
 * Tests for Stripe provider utility functions
 */

import {
  convertToOpenAIMessages,
  mapOpenAIFinishReason,
  normalizeModelId,
} from '../utils';

describe('Stripe Provider Utils', () => {
  describe('convertToOpenAIMessages', () => {
    it('should convert system message', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.',
      });
    });

    it('should convert user text message', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'user',
          content: [{type: 'text', text: 'Hello!'}],
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      // Single text messages are sent as simple strings for Anthropic compatibility
      expect(result[0].content).toBe('Hello!');
    });

    it('should convert user message with file URL', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'user',
          content: [
            {type: 'text', text: 'What is this?'},
            {
              type: 'file',
              data: 'https://example.com/image.jpg',
              mediaType: 'image/jpeg',
            },
          ],
        },
      ]);

      expect(result).toHaveLength(1);
      // Multi-part messages should remain as arrays
      expect(Array.isArray(result[0].content)).toBe(true);
      const content = result[0].content as any[];
      expect(content).toHaveLength(2);
      expect(content[1].type).toBe('image_url');
      expect(content[1].image_url.url).toBe('https://example.com/image.jpg');
    });

    it('should convert user message with file Uint8Array to base64', () => {
      const fileData = new Uint8Array([137, 80, 78, 71]); // PNG header

      const result = convertToOpenAIMessages([
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data: fileData,
              mediaType: 'image/png',
            },
          ],
        },
      ]);

      expect(result).toHaveLength(1);
      // Single file becomes array with one element
      expect(Array.isArray(result[0].content)).toBe(true);
      const content = result[0].content as any[];
      expect(content).toHaveLength(1);
      expect(content[0].type).toBe('image_url');
      expect(content[0].image_url.url).toMatch(/^data:image\/png;base64,/);
    });

    it('should convert large file Uint8Array without overflowing the stack', () => {
      const fileData = Uint8Array.from({length: 200_000}, (_, index) => index % 256);

      const result = convertToOpenAIMessages([
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data: fileData,
              mediaType: 'image/png',
            },
          ],
        },
      ]);

      const content = result[0].content as any[];
      expect(content[0].image_url.url).toBe(
        `data:image/png;base64,${Buffer.from(fileData).toString('base64')}`
      );
    });

    it('should convert assistant message with text', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'assistant',
          content: [{type: 'text', text: 'Hello! How can I help?'}],
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: 'Hello! How can I help?',
        tool_calls: undefined,
      });
    });

    it('should convert assistant message with tool calls', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'getWeather',
              input: {location: 'San Francisco'},
            },
          ],
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toBe(''); // Empty string when only tool calls
      expect(result[0].tool_calls).toHaveLength(1);
      expect(result[0].tool_calls![0]).toEqual({
        id: 'call_123',
        type: 'function',
        function: {
          name: 'getWeather',
          arguments: '{"location":"San Francisco"}',
        },
      });
    });

    it('should convert assistant message with text and tool calls', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'assistant',
          content: [
            {type: 'text', text: 'Let me check the weather.'},
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'getWeather',
              input: {location: 'Paris'},
            },
          ],
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toBe('Let me check the weather.');
      expect(result[0].tool_calls).toHaveLength(1);
    });

    it('should convert tool message', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_123',
              toolName: 'getWeather',
              output: {type: 'json', value: {temperature: 72, condition: 'Sunny'}},
            },
          ],
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'tool',
        tool_call_id: 'call_123',
        name: 'getWeather',
        content: '{"temperature":72,"condition":"Sunny"}',
      });
    });

    it('should handle string tool call args', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'test',
              input: '{"key":"value"}',
            },
          ],
        },
      ]);

      expect(result[0].tool_calls![0].function.arguments).toBe('{"key":"value"}');
    });

    it('should handle string tool result', () => {
      const result = convertToOpenAIMessages([
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_123',
              toolName: 'test',
              output: {type: 'text', value: 'Simple string result'},
            },
          ],
        },
      ]);

      expect(result[0].content).toBe('Simple string result');
    });

    it('should convert multiple messages', () => {
      const result = convertToOpenAIMessages([
        {role: 'system', content: 'You are helpful.'},
        {role: 'user', content: [{type: 'text', text: 'Hello'}]},
        {role: 'assistant', content: [{type: 'text', text: 'Hi!'}]},
      ]);

      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('user');
      expect(result[2].role).toBe('assistant');
    });

    it('should throw error for unsupported message role', () => {
      expect(() => {
        convertToOpenAIMessages([
          // @ts-expect-error - Testing invalid role
          {role: 'invalid', content: 'test'},
        ]);
      }).toThrow('Unsupported message role');
    });

    it('should throw error for unsupported part type', () => {
      expect(() => {
        convertToOpenAIMessages([
          {
            role: 'user',
            // @ts-expect-error - Testing invalid part type
            content: [{type: 'unsupported', data: 'test'}],
          },
        ]);
      }).toThrow('Unsupported user message part type');
    });
  });

  describe('mapOpenAIFinishReason', () => {
    it('should map "stop" to "stop"', () => {
      expect(mapOpenAIFinishReason('stop')).toBe('stop');
    });

    it('should map "length" to "length"', () => {
      expect(mapOpenAIFinishReason('length')).toBe('length');
    });

    it('should map "content_filter" to "content-filter"', () => {
      expect(mapOpenAIFinishReason('content_filter')).toBe('content-filter');
    });

    it('should map "tool_calls" to "tool-calls"', () => {
      expect(mapOpenAIFinishReason('tool_calls')).toBe('tool-calls');
    });

    it('should map "function_call" to "tool-calls"', () => {
      expect(mapOpenAIFinishReason('function_call')).toBe('tool-calls');
    });

    it('should map null to "unknown"', () => {
      expect(mapOpenAIFinishReason(null)).toBe('unknown');
    });

    it('should map undefined to "unknown"', () => {
      expect(mapOpenAIFinishReason(undefined)).toBe('unknown');
    });

    it('should map unknown reason to "unknown"', () => {
      expect(mapOpenAIFinishReason('some_other_reason')).toBe('unknown');
    });
  });

  describe('normalizeModelId', () => {
    describe('Anthropic models', () => {
      it('should remove date suffix (YYYYMMDD format)', () => {
        // Note: The date is removed AND version dashes are converted to dots
        expect(normalizeModelId('anthropic/claude-3-5-sonnet-20241022')).toBe(
          'anthropic/claude-3.5-sonnet'
        );
        expect(normalizeModelId('anthropic/claude-sonnet-4-20250101')).toBe(
          'anthropic/claude-sonnet-4'
        );
        expect(normalizeModelId('anthropic/claude-opus-4-20241231')).toBe(
          'anthropic/claude-opus-4'
        );
      });

      it('should remove -latest suffix', () => {
        expect(normalizeModelId('anthropic/claude-sonnet-4-latest')).toBe(
          'anthropic/claude-sonnet-4'
        );
        expect(normalizeModelId('anthropic/claude-opus-4-latest')).toBe(
          'anthropic/claude-opus-4'
        );
      });

      it('should convert version dashes to dots (claude-3-5 → claude-3.5)', () => {
        expect(normalizeModelId('anthropic/claude-3-5-sonnet')).toBe(
          'anthropic/claude-3.5-sonnet'
        );
        expect(normalizeModelId('anthropic/claude-3-7-sonnet')).toBe(
          'anthropic/claude-3.7-sonnet'
        );
      });

      it('should handle version numbers without model names (sonnet-4-5 → sonnet-4.5)', () => {
        expect(normalizeModelId('anthropic/sonnet-4-5')).toBe(
          'anthropic/sonnet-4.5'
        );
        expect(normalizeModelId('anthropic/opus-4-1')).toBe(
          'anthropic/opus-4.1'
        );
      });

      it('should handle combined date suffix and version conversion', () => {
        expect(normalizeModelId('anthropic/claude-3-5-sonnet-20241022')).toBe(
          'anthropic/claude-3.5-sonnet'
        );
        expect(normalizeModelId('anthropic/claude-3-7-sonnet-20250115')).toBe(
          'anthropic/claude-3.7-sonnet'
        );
      });

      it('should handle -latest suffix with version conversion', () => {
        expect(normalizeModelId('anthropic/claude-3-5-sonnet-latest')).toBe(
          'anthropic/claude-3.5-sonnet'
        );
        expect(normalizeModelId('anthropic/sonnet-4-5-latest')).toBe(
          'anthropic/sonnet-4.5'
        );
      });

      it('should handle models without dates or versions', () => {
        expect(normalizeModelId('anthropic/claude-sonnet')).toBe(
          'anthropic/claude-sonnet'
        );
        expect(normalizeModelId('anthropic/claude-opus')).toBe(
          'anthropic/claude-opus'
        );
      });

      it('should handle case-insensitive provider names', () => {
        expect(normalizeModelId('Anthropic/claude-3-5-sonnet-20241022')).toBe(
          'Anthropic/claude-3.5-sonnet'
        );
        expect(normalizeModelId('ANTHROPIC/claude-3-5-sonnet-20241022')).toBe(
          'ANTHROPIC/claude-3.5-sonnet'
        );
      });
    });

    describe('OpenAI models', () => {
      it('should remove date suffix in YYYY-MM-DD format', () => {
        expect(normalizeModelId('openai/gpt-4-turbo-2024-04-09')).toBe(
          'openai/gpt-4-turbo'
        );
        expect(normalizeModelId('openai/gpt-4-2024-12-31')).toBe(
          'openai/gpt-4'
        );
      });

      it('should keep gpt-4o-2024-05-13 as an exception', () => {
        expect(normalizeModelId('openai/gpt-4o-2024-05-13')).toBe(
          'openai/gpt-4o-2024-05-13'
        );
      });

      it('should handle models without dates', () => {
        expect(normalizeModelId('openai/gpt-5')).toBe('openai/gpt-5');
        expect(normalizeModelId('openai/gpt-4.1')).toBe('openai/gpt-4.1');
        expect(normalizeModelId('openai/o3')).toBe('openai/o3');
      });

      it('should handle case-insensitive provider names', () => {
        expect(normalizeModelId('OpenAI/gpt-4-2024-12-31')).toBe(
          'OpenAI/gpt-4'
        );
        expect(normalizeModelId('OPENAI/gpt-4-turbo-2024-04-09')).toBe(
          'OPENAI/gpt-4-turbo'
        );
      });

      it('should not affect YYYYMMDD format (only YYYY-MM-DD)', () => {
        // OpenAI only removes YYYY-MM-DD format, not YYYYMMDD
        expect(normalizeModelId('openai/gpt-4-20241231')).toBe(
          'openai/gpt-4-20241231'
        );
      });
    });

    describe('Google/Gemini models', () => {
      it('should keep models as-is', () => {
        expect(normalizeModelId('google/gemini-2.5-pro')).toBe(
          'google/gemini-2.5-pro'
        );
        expect(normalizeModelId('google/gemini-2.0-flash')).toBe(
          'google/gemini-2.0-flash'
        );
        expect(normalizeModelId('google/gemini-1.5-pro')).toBe(
          'google/gemini-1.5-pro'
        );
      });

      it('should not remove any suffixes', () => {
        expect(normalizeModelId('google/gemini-2.5-pro-20250101')).toBe(
          'google/gemini-2.5-pro-20250101'
        );
        expect(normalizeModelId('google/gemini-2.5-pro-latest')).toBe(
          'google/gemini-2.5-pro-latest'
        );
      });
    });

    describe('Other providers', () => {
      it('should keep unknown provider models as-is', () => {
        expect(normalizeModelId('bedrock/claude-3-5-sonnet')).toBe(
          'bedrock/claude-3-5-sonnet'
        );
        expect(normalizeModelId('azure/gpt-4-2024-12-31')).toBe(
          'azure/gpt-4-2024-12-31'
        );
        expect(normalizeModelId('custom/my-model-1-2-3')).toBe(
          'custom/my-model-1-2-3'
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle model IDs without provider prefix', () => {
        // If no slash, return as-is
        expect(normalizeModelId('gpt-5')).toBe('gpt-5');
        expect(normalizeModelId('claude-sonnet-4')).toBe('claude-sonnet-4');
      });

      it('should handle model IDs with multiple slashes', () => {
        // If more than one slash, return as-is
        expect(normalizeModelId('provider/category/model')).toBe(
          'provider/category/model'
        );
      });

      it('should handle empty strings', () => {
        expect(normalizeModelId('')).toBe('');
      });
    });
  });
});

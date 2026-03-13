/**
 * Tests for AI SDK billing wrapper with other providers and unsupported models
 * Tests error handling and edge cases with mocks
 */

import Stripe from 'stripe';
import {createOpenAI} from '@ai-sdk/openai';
import {meteredModel} from '../index';

// Mock Stripe
jest.mock('stripe');

describe('AI SDK Billing Wrapper - Other Providers', () => {
  let mockMeterEventsCreate: jest.Mock;
  const TEST_API_KEY = 'sk_test_mock_key';

  beforeEach(() => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('OpenAI-Compatible Providers', () => {
    it('should work with Together AI (OpenAI-compatible)', async () => {
      const together = createOpenAI({
        apiKey: 'mock-key',
        baseURL: 'https://api.together.xyz/v1',
      });

      const model = meteredModel(
        together('meta-llama/Llama-3-70b-chat-hf'),
        TEST_API_KEY,
        'cus_test123'
      );

      const originalModel = together('meta-llama/Llama-3-70b-chat-hf');
      jest.spyOn(originalModel, 'doGenerate').mockResolvedValue({
        text: 'Together AI response',
        usage: {
          inputTokens: 12,
          outputTokens: 5,
        },
        finishReason: 'stop',
        rawResponse: {},
        warnings: [],
      } as any);

      // Copy the mock to our wrapped model's internal model
      (model as any).model.doGenerate = originalModel.doGenerate;

      await model.doGenerate({
        inputFormat: 'prompt',
        mode: {type: 'regular'},
        prompt: [],
      } as any);

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
    });

    it('should work with custom OpenAI-compatible providers', async () => {
      const customProvider = createOpenAI({
        apiKey: 'mock-key',
        baseURL: 'https://custom-ai.example.com/v1',
      });

      const model = meteredModel(
        customProvider('custom-model-v1'),
        TEST_API_KEY,
        'cus_test123'
      );

      const originalModel = customProvider('custom-model-v1');
      jest.spyOn(originalModel, 'doGenerate').mockResolvedValue({
        text: 'Custom response',
        usage: {
          inputTokens: 8,
          outputTokens: 3,
        },
        finishReason: 'stop',
        rawResponse: {},
        warnings: [],
      } as any);

      (model as any).model.doGenerate = originalModel.doGenerate;

      await model.doGenerate({
        inputFormat: 'prompt',
        mode: {type: 'regular'},
        prompt: [],
      } as any);

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '8',
            token_type: 'input',
          }),
        })
      );
    });
  });

  describe('Unsupported Models', () => {
    it('should throw error for model with v1 specification', () => {
      const mockModel = {
        modelId: 'mock-model-v1',
        provider: 'mock-provider',
        specificationVersion: 'v1',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      } as any;

      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow('Only LanguageModelV2 and LanguageModelV3 models are supported');
    });

    it('should throw error for model without specification version', () => {
      const mockModel = {
        modelId: 'mock-model-unknown',
        provider: 'unknown-provider',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      } as any;

      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow('Only LanguageModelV2 and LanguageModelV3 models are supported');
    });

    it('should throw error for model with unknown specification version', () => {
      const mockModel = {
        modelId: 'mock-model-v99',
        provider: 'future-provider',
        specificationVersion: 'v99',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      } as any;

      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow('Only LanguageModelV2 and LanguageModelV3 models are supported');
    });

    it('should provide clear error message', () => {
      const mockModel = {specificationVersion: 'v1'} as any;

      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow(/Only LanguageModelV2 and LanguageModelV3 models are supported/);
      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow(/Please use a supported provider/);
    });
  });

  describe('Provider Support', () => {
    it('should support any v2 provider name', async () => {
      const customProviderModel = {
        modelId: 'custom-model-123',
        provider: 'my-custom-provider',
        specificationVersion: 'v2',
        doGenerate: jest.fn().mockResolvedValue({
          text: 'Custom response',
          usage: {
            inputTokens: 10,
            outputTokens: 5,
          },
          finishReason: 'stop',
          rawResponse: {},
          warnings: [],
        }),
        doStream: jest.fn(),
      } as any;

      const wrapped = meteredModel(
        customProviderModel,
        TEST_API_KEY,
        'cus_test123'
      );

      await wrapped.doGenerate({
        inputFormat: 'prompt',
        mode: {type: 'regular'},
        prompt: [],
      } as any);

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(wrapped).toBeDefined();
      expect(wrapped.provider).toBe('my-custom-provider');
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            model: 'my-custom-provider/custom-model-123',
          }),
        })
      );
    });

    it('should provide helpful error message for unsupported models', () => {
      const unsupportedModel = {
        modelId: 'test',
        provider: 'test-provider',
        specificationVersion: 'v1',
      } as any;

      try {
        meteredModel(unsupportedModel, TEST_API_KEY, 'cus_test123');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Only LanguageModelV2 and LanguageModelV3 models are supported');
        expect(error.message).toContain('specificationVersion "v1"');
        expect(error.message).toContain('OpenAI, Anthropic, Google');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle model with missing usage data', async () => {
      const model = {
        modelId: 'test-model',
        provider: 'test-provider',
        specificationVersion: 'v2',
        doGenerate: jest.fn().mockResolvedValue({
          text: 'Response',
          usage: undefined,
          finishReason: 'stop',
          rawResponse: {},
          warnings: [],
        }),
        doStream: jest.fn(),
      } as any;

      const wrapped = meteredModel(model, TEST_API_KEY, 'cus_test123');

      await wrapped.doGenerate({
        inputFormat: 'prompt',
        mode: {type: 'regular'},
        prompt: [],
      } as any);

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      // Should not create meter events with 0 tokens (code only sends when > 0)
      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(0);
    });

    it('should handle model with partial usage data', async () => {
      const model = {
        modelId: 'test-model',
        provider: 'test-provider',
        specificationVersion: 'v2',
        doGenerate: jest.fn().mockResolvedValue({
          text: 'Response',
          usage: {
            inputTokens: 10,
            outputTokens: undefined,
          },
          finishReason: 'stop',
          rawResponse: {},
          warnings: [],
        }),
        doStream: jest.fn(),
      } as any;

      const wrapped = meteredModel(model, TEST_API_KEY, 'cus_test123');

      await wrapped.doGenerate({
        inputFormat: 'prompt',
        mode: {type: 'regular'},
        prompt: [],
      } as any);

      // Wait for fire-and-forget logging to complete
      await new Promise(resolve => setImmediate(resolve));

      // Should handle partial data gracefully - only sends event for input tokens
      // Output tokens with value 0 are not sent (code only sends when > 0)
      expect(mockMeterEventsCreate).toHaveBeenCalledTimes(1);
      expect(mockMeterEventsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            value: '10',
            token_type: 'input',
          }),
        })
      );
    });
  });
});

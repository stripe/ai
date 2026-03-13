/**
 * General tests for AI SDK billing wrapper functionality
 * Tests provider detection, model wrapping, and error handling with mocks
 */

import Stripe from 'stripe';
import {openai} from '@ai-sdk/openai';
import {anthropic} from '@ai-sdk/anthropic';
import {google} from '@ai-sdk/google';
import {meteredModel} from '../index';
import {determineProvider} from '../utils';

// Mock Stripe
jest.mock('stripe');

describe('AI SDK Billing Wrapper - General', () => {
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

  describe('Provider Detection', () => {
    it('should correctly detect OpenAI provider', () => {
      expect(determineProvider('openai')).toBe('openai');
      expect(determineProvider('openai.chat')).toBe('openai');
    });

    it('should correctly detect Anthropic provider', () => {
      expect(determineProvider('anthropic')).toBe('anthropic');
      expect(determineProvider('anthropic.messages')).toBe('anthropic');
    });

    it('should correctly detect Google provider', () => {
      expect(determineProvider('google')).toBe('google');
      expect(determineProvider('google-generative-ai')).toBe('google');
      expect(determineProvider('gemini')).toBe('google');
    });

    it('should correctly detect Azure provider', () => {
      expect(determineProvider('azure')).toBe('azure');
      expect(determineProvider('azure-openai')).toBe('azure');
    });

    it('should correctly detect Bedrock provider', () => {
      expect(determineProvider('bedrock')).toBe('bedrock');
      expect(determineProvider('amazon-bedrock')).toBe('bedrock');
    });

    it('should correctly detect other providers', () => {
      expect(determineProvider('groq')).toBe('groq');
      expect(determineProvider('huggingface')).toBe('huggingface');
      expect(determineProvider('together')).toBe('together');
    });

    it('should return lowercased provider name for unknown providers', () => {
      expect(determineProvider('unknown-provider')).toBe('unknown-provider');
      expect(determineProvider('Custom-Provider')).toBe('custom-provider');
      expect(determineProvider('MY-NEW-AI')).toBe('my-new-ai');
    });
  });

  describe('Model Wrapping', () => {
    it('should return wrapped model with same specification version', () => {
      const originalModel = openai('gpt-4o-mini');
      const wrappedModel = meteredModel(originalModel, TEST_API_KEY, 'cus_test123');

      expect(wrappedModel.specificationVersion).toBe(originalModel.specificationVersion);
    });

    it('should preserve model ID', () => {
      const originalModel = openai('gpt-4o-mini');
      const wrappedModel = meteredModel(originalModel, TEST_API_KEY, 'cus_test123');

      expect(wrappedModel.modelId).toBe(originalModel.modelId);
    });

    it('should preserve provider', () => {
      const originalModel = openai('gpt-4o-mini');
      const wrappedModel = meteredModel(originalModel, TEST_API_KEY, 'cus_test123');

      expect(wrappedModel.provider).toBe(originalModel.provider);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for model without specification version', () => {
      const mockModel = {
        modelId: 'test-model',
        provider: 'test-provider',
      } as any;

      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow('Only LanguageModelV2 and LanguageModelV3 models are supported');
    });

    it('should throw error for unsupported specification version', () => {
      const mockModel = {
        modelId: 'test-model',
        provider: 'test-provider',
        specificationVersion: 'v99',
      } as any;

      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow('Only LanguageModelV2 and LanguageModelV3 models are supported');
    });

    it('should provide clear error messages', () => {
      const mockModel = {
        modelId: 'test-model',
        provider: 'test-provider',
        specificationVersion: 'v1',
      } as any;

      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow(/specificationVersion "v1"/);
      expect(() => {
        meteredModel(mockModel, TEST_API_KEY, 'cus_test123');
      }).toThrow(/OpenAI, Anthropic, Google/);
    });
  });

  describe('Multi-Provider Integration', () => {
    it('should work with different providers', () => {
      const openaiModel = meteredModel(openai('gpt-4o-mini'), TEST_API_KEY, 'cus_test');
      const anthropicModel = meteredModel(anthropic('claude-3-5-haiku-20241022'), TEST_API_KEY, 'cus_test');
      const googleModel = meteredModel(google('gemini-2.5-flash'), TEST_API_KEY, 'cus_test');

      // Verify all models are wrapped correctly
      expect(openaiModel).toBeDefined();
      expect(anthropicModel).toBeDefined();
      expect(googleModel).toBeDefined();
      
      // Verify model IDs are preserved
      expect(openaiModel.modelId).toBe('gpt-4o-mini');
      expect(anthropicModel.modelId).toBe('claude-3-5-haiku-20241022');
      expect(googleModel.modelId).toBe('gemini-2.5-flash');
    });

    it('should support custom v2 provider', () => {
      const customModel = {
        modelId: 'custom-123',
        provider: 'custom-ai',
        specificationVersion: 'v2',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      } as any;

      const wrapped = meteredModel(customModel, TEST_API_KEY, 'cus_test');
      
      expect(wrapped).toBeDefined();
      expect(wrapped.provider).toBe('custom-ai');
      expect(wrapped.modelId).toBe('custom-123');
    });
  });
});

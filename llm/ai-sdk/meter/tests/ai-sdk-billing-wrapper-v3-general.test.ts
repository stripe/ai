/**
 * General tests for AI SDK billing wrapper V3 functionality
 * Tests provider detection, model wrapping, V2/V3 auto-detection, and error handling
 */

import Stripe from 'stripe';
import {meteredModel} from '../index';
import {determineProvider, extractUsageFromStreamV3} from '../utils';

jest.mock('stripe');

describe('AI SDK Billing Wrapper - V3 General', () => {
  let mockMeterEventsCreate: jest.Mock;
  const TEST_API_KEY = 'sk_test_mock_key';

  beforeEach(() => {
    mockMeterEventsCreate = jest.fn().mockResolvedValue({});

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

  describe('V3 Model Wrapping', () => {
    it('should return wrapped model with same specification version for v3', () => {
      const mockModel = {
        modelId: 'test-model',
        provider: 'openai.chat',
        specificationVersion: 'v3',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
        supportedUrls: {},
      } as any;

      const wrappedModel = meteredModel(
        mockModel,
        TEST_API_KEY,
        'cus_test123'
      );

      expect(wrappedModel.specificationVersion).toBe('v3');
    });

    it('should preserve model ID for v3 model', () => {
      const mockModel = {
        modelId: 'gpt-5',
        provider: 'openai.chat',
        specificationVersion: 'v3',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
        supportedUrls: {},
      } as any;

      const wrappedModel = meteredModel(
        mockModel,
        TEST_API_KEY,
        'cus_test123'
      );

      expect(wrappedModel.modelId).toBe('gpt-5');
    });

    it('should preserve provider for v3 model', () => {
      const mockModel = {
        modelId: 'test',
        provider: 'openai.chat',
        specificationVersion: 'v3',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
        supportedUrls: {},
      } as any;

      const wrappedModel = meteredModel(
        mockModel,
        TEST_API_KEY,
        'cus_test123'
      );

      expect(wrappedModel.provider).toBe('openai.chat');
    });

    it('should preserve supportedUrls for v3 model', () => {
      const urls = {'image/*': [/example\.com/]};
      const mockModel = {
        modelId: 'test',
        provider: 'openai.chat',
        specificationVersion: 'v3',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
        supportedUrls: urls,
      } as any;

      const wrappedModel = meteredModel(
        mockModel,
        TEST_API_KEY,
        'cus_test123'
      );

      expect(wrappedModel.supportedUrls).toBe(urls);
    });
  });

  describe('V2/V3 Auto-Detection', () => {
    it('should accept v2 models', () => {
      const v2Model = {
        modelId: 'test-v2',
        provider: 'test-provider',
        specificationVersion: 'v2',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      } as any;

      const wrapped = meteredModel(v2Model, TEST_API_KEY, 'cus_test');

      expect(wrapped).toBeDefined();
      expect(wrapped.specificationVersion).toBe('v2');
    });

    it('should accept v3 models', () => {
      const v3Model = {
        modelId: 'test-v3',
        provider: 'test-provider',
        specificationVersion: 'v3',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
        supportedUrls: {},
      } as any;

      const wrapped = meteredModel(v3Model, TEST_API_KEY, 'cus_test');

      expect(wrapped).toBeDefined();
      expect(wrapped.specificationVersion).toBe('v3');
    });

    it('should reject v1 models', () => {
      const v1Model = {
        modelId: 'test-v1',
        provider: 'test-provider',
        specificationVersion: 'v1',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      } as any;

      expect(() => {
        meteredModel(v1Model, TEST_API_KEY, 'cus_test');
      }).toThrow(
        'Only LanguageModelV2 and LanguageModelV3 models are supported'
      );
    });

    it('should reject models without specificationVersion', () => {
      const noSpecModel = {
        modelId: 'test',
        provider: 'test-provider',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
      } as any;

      expect(() => {
        meteredModel(noSpecModel, TEST_API_KEY, 'cus_test');
      }).toThrow(
        'Only LanguageModelV2 and LanguageModelV3 models are supported'
      );
    });
  });

  describe('V3 Custom Provider Support', () => {
    it('should support custom v3 provider', () => {
      const customModel = {
        modelId: 'custom-123',
        provider: 'custom-ai',
        specificationVersion: 'v3',
        doGenerate: jest.fn(),
        doStream: jest.fn(),
        supportedUrls: {},
      } as any;

      const wrapped = meteredModel(customModel, TEST_API_KEY, 'cus_test');

      expect(wrapped).toBeDefined();
      expect(wrapped.provider).toBe('custom-ai');
      expect(wrapped.modelId).toBe('custom-123');
    });
  });

  describe('extractUsageFromStreamV3', () => {
    it('should extract usage from V3 finish chunk', () => {
      const chunks = [
        {type: 'text-start', id: 't1'} as any,
        {type: 'text-delta', id: 't1', delta: 'Hello'} as any,
        {type: 'text-end', id: 't1'} as any,
        {
          type: 'finish',
          finishReason: {unified: 'stop', raw: 'stop'},
          usage: {
            inputTokens: {
              total: 15,
              noCache: undefined,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: 8,
              text: undefined,
              reasoning: undefined,
            },
          },
        } as any,
      ];

      const result = extractUsageFromStreamV3(chunks);

      expect(result.inputTokens).toBe(15);
      expect(result.outputTokens).toBe(8);
    });

    it('should return zeros when no finish chunk present', () => {
      const chunks = [
        {type: 'text-start', id: 't1'} as any,
        {type: 'text-delta', id: 't1', delta: 'Hello'} as any,
      ];

      const result = extractUsageFromStreamV3(chunks);

      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });

    it('should handle undefined total in usage', () => {
      const chunks = [
        {
          type: 'finish',
          finishReason: {unified: 'stop', raw: 'stop'},
          usage: {
            inputTokens: {
              total: undefined,
              noCache: undefined,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: undefined,
              text: undefined,
              reasoning: undefined,
            },
          },
        } as any,
      ];

      const result = extractUsageFromStreamV3(chunks);

      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });
  });
});

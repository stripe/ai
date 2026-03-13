/**
 * Tests for Stripe AI SDK Provider V3
 */

import {createStripeV3, stripeV3} from '../index';
import {StripeLanguageModelV3} from '../stripe-language-model-v3';

describe('Stripe Provider V3', () => {
  describe('createStripeV3', () => {
    it('should create a provider instance', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
        customerId: 'cus_123',
      });

      expect(provider).toBeDefined();
      expect(typeof provider).toBe('function');
      expect(provider.languageModel).toBeDefined();
    });

    it('should create a language model with provider function', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
        customerId: 'cus_123',
      });

      const model = provider('openai/gpt-5');

      expect(model).toBeInstanceOf(StripeLanguageModelV3);
      expect(model.modelId).toBe('openai/gpt-5');
      expect(model.provider).toBe('stripe');
      expect(model.specificationVersion).toBe('v3');
    });

    it('should create a language model with languageModel method', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
        customerId: 'cus_123',
      });

      const model = provider.languageModel('google/gemini-2.5-pro');

      expect(model).toBeInstanceOf(StripeLanguageModelV3);
      expect(model.modelId).toBe('google/gemini-2.5-pro');
    });

    it('should throw error when called with new keyword', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
      });

      expect(() => {
        // @ts-expect-error - Testing error case
        new provider('openai/gpt-5');
      }).toThrow(
        'The Stripe provider function cannot be called with the new keyword.'
      );
    });

    it('should use default baseURL when not provided', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
        customerId: 'cus_123',
      });

      const model = provider('openai/gpt-5') as any;
      expect(model.config.baseURL).toBe('https://llm.stripe.com');
    });

    it('should use custom baseURL when provided', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
        customerId: 'cus_123',
        baseURL: 'https://custom.stripe.com',
      });

      const model = provider('openai/gpt-5') as any;
      expect(model.config.baseURL).toBe('https://custom.stripe.com');
    });

    it('should merge customer IDs from provider and model settings', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
        customerId: 'cus_provider',
      });

      const model1 = provider('openai/gpt-5') as any;
      expect(model1.settings.customerId).toBe('cus_provider');

      const model2 = provider('openai/gpt-5', {
        customerId: 'cus_model',
      }) as any;
      expect(model2.settings.customerId).toBe('cus_model');
    });

    it('should throw error for embedding models', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
      });

      expect(() => {
        provider.embeddingModel('openai/text-embedding-3-small');
      }).toThrow('Embedding models are not yet supported by Stripe provider');
    });

    it('should throw error for text embedding models', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
      });

      expect(() => {
        provider.textEmbeddingModel!('openai/text-embedding-3-small');
      }).toThrow('Text embedding models are not yet supported by Stripe provider');
    });

    it('should throw error for image models', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
      });

      expect(() => {
        provider.imageModel('openai/dall-e-3');
      }).toThrow('Image models are not yet supported by Stripe provider');
    });
  });

  describe('default stripeV3 provider', () => {
    beforeEach(() => {
      delete process.env.STRIPE_API_KEY;
    });

    it('should be defined', () => {
      expect(stripeV3).toBeDefined();
      expect(typeof stripeV3).toBe('function');
    });

    it('should use STRIPE_API_KEY from environment', () => {
      process.env.STRIPE_API_KEY = 'sk_test_env';

      const model = stripeV3('openai/gpt-5', {customerId: 'cus_123'});
      expect(model).toBeDefined();
    });
  });

  describe('API key handling', () => {
    it('should throw error when API key is not provided', () => {
      delete process.env.STRIPE_API_KEY;

      const provider = createStripeV3({
        customerId: 'cus_123',
      });

      expect(() => {
        const model = provider('openai/gpt-5') as any;
        model.config.headers();
      }).toThrow(
        'Stripe API key is required. Provide it via config.apiKey or STRIPE_API_KEY environment variable.'
      );
    });

    it('should use API key from config', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_config',
        customerId: 'cus_123',
      });

      const model = provider('openai/gpt-5') as any;
      const headers = model.config.headers();

      expect(headers.Authorization).toBe('Bearer sk_test_config');
    });

    it('should prefer config API key over environment', () => {
      process.env.STRIPE_API_KEY = 'sk_test_env';

      const provider = createStripeV3({
        apiKey: 'sk_test_config',
        customerId: 'cus_123',
      });

      const model = provider('openai/gpt-5') as any;
      const headers = model.config.headers();

      expect(headers.Authorization).toBe('Bearer sk_test_config');
    });
  });

  describe('headers handling', () => {
    it('should include custom headers from provider config', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
        customerId: 'cus_123',
        headers: {
          'X-Custom': 'provider-value',
        },
      });

      const model = provider('openai/gpt-5') as any;
      const headers = model.config.headers();

      expect(headers['X-Custom']).toBe('provider-value');
    });

    it('should include custom headers from model settings', () => {
      const provider = createStripeV3({
        apiKey: 'sk_test_123',
      });

      const model = provider('openai/gpt-5', {
        customerId: 'cus_123',
        headers: {
          'X-Model': 'model-value',
        },
      }) as any;

      expect(model.settings.headers['X-Model']).toBe('model-value');
    });
  });

  describe('supported models', () => {
    const provider = createStripeV3({
      apiKey: 'sk_test_123',
      customerId: 'cus_123',
    });

    const testModels = [
      'openai/gpt-5',
      'openai/gpt-4.1',
      'openai/o3',
      'google/gemini-2.5-pro',
      'google/gemini-2.0-flash',
      'anthropic/claude-sonnet-4',
      'anthropic/claude-opus-4',
    ];

    testModels.forEach((modelId) => {
      it(`should create model for ${modelId}`, () => {
        const model = provider(modelId);
        expect(model.modelId).toBe(modelId);
      });
    });
  });

  describe('model name normalization', () => {
    const provider = createStripeV3({
      apiKey: 'sk_test_123',
      customerId: 'cus_123',
    });

    describe('Anthropic models', () => {
      it('should normalize model with date suffix (YYYYMMDD)', () => {
        const model = provider('anthropic/claude-3-5-sonnet-20241022');
        expect(model.modelId).toBe('anthropic/claude-3.5-sonnet');
      });

      it('should normalize model with -latest suffix', () => {
        const model = provider('anthropic/claude-sonnet-4-latest');
        expect(model.modelId).toBe('anthropic/claude-sonnet-4');
      });

      it('should normalize version dashes to dots', () => {
        const model = provider('anthropic/claude-3-5-sonnet');
        expect(model.modelId).toBe('anthropic/claude-3.5-sonnet');
      });

      it('should handle combined normalization (date + version)', () => {
        const model = provider('anthropic/claude-3-7-sonnet-20250115');
        expect(model.modelId).toBe('anthropic/claude-3.7-sonnet');
      });

      it('should normalize sonnet-4-5 to sonnet-4.5', () => {
        const model = provider('anthropic/sonnet-4-5');
        expect(model.modelId).toBe('anthropic/sonnet-4.5');
      });

      it('should normalize opus-4-1 to opus-4.1', () => {
        const model = provider('anthropic/opus-4-1');
        expect(model.modelId).toBe('anthropic/opus-4.1');
      });
    });

    describe('OpenAI models', () => {
      it('should normalize model with date suffix (YYYY-MM-DD)', () => {
        const model = provider('openai/gpt-4-turbo-2024-04-09');
        expect(model.modelId).toBe('openai/gpt-4-turbo');
      });

      it('should keep gpt-4o-2024-05-13 as exception', () => {
        const model = provider('openai/gpt-4o-2024-05-13');
        expect(model.modelId).toBe('openai/gpt-4o-2024-05-13');
      });

      it('should not normalize YYYYMMDD format (only YYYY-MM-DD)', () => {
        const model = provider('openai/gpt-4-20241231');
        expect(model.modelId).toBe('openai/gpt-4-20241231');
      });
    });

    describe('Google models', () => {
      it('should keep Google models unchanged', () => {
        const model = provider('google/gemini-2.5-pro');
        expect(model.modelId).toBe('google/gemini-2.5-pro');
      });

      it('should not remove any suffixes from Google models', () => {
        const model = provider('google/gemini-2.5-pro-20250101');
        expect(model.modelId).toBe('google/gemini-2.5-pro-20250101');
      });
    });

    describe('Other providers', () => {
      it('should keep unknown provider models unchanged', () => {
        const model = provider('custom/my-model-1-2-3');
        expect(model.modelId).toBe('custom/my-model-1-2-3');
      });
    });
  });
});

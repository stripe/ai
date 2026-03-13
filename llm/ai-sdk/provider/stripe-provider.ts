/**
 * Stripe AI SDK Provider
 * Integrates with Stripe's llm.stripe.com proxy for usage-based billing
 */

import {LanguageModelV2, LanguageModelV3, ProviderV2, ProviderV3} from '@ai-sdk/provider';
import {StripeLanguageModel} from './stripe-language-model';
import {StripeLanguageModelV3} from './stripe-language-model-v3';
import {
  StripeLanguageModelSettings,
  StripeProviderConfig,
} from './types';
import {normalizeModelId} from './utils';

/**
 * Stripe Provider interface
 */
export interface StripeProvider extends ProviderV2 {
  /**
   * Create a language model with the given model ID
   * @param modelId - Model ID in Stripe format (e.g., 'openai/gpt-5', 'google/gemini-2.5-pro')
   * @param settings - Optional settings for the model
   */
  (modelId: string, settings?: StripeLanguageModelSettings): LanguageModelV2;

  /**
   * Create a language model (alias for direct call)
   */
  languageModel(
    modelId: string,
    settings?: StripeLanguageModelSettings
  ): LanguageModelV2;
}

/**
 * Create a Stripe provider instance
 *
 * @param config - Provider configuration options
 * @returns Stripe provider instance
 *
 * @example
 * ```ts
 * import { createStripe } from '@stripe/ai-sdk/provider';
 *
 * const stripeLLM = createStripe({
 *   apiKey: process.env.STRIPE_API_KEY,
 *   customerId: 'cus_xxxxx' // Optional default customer ID
 * });
 *
 * const model = stripe('openai/gpt-5');
 * ```
 */
export function createStripe(config: StripeProviderConfig = {}): StripeProvider {
  const baseURL = config.baseURL || 'https://llm.stripe.com';

  const createModel = (
    modelId: string,
    settings: StripeLanguageModelSettings = {}
  ): LanguageModelV2 => {
    // Normalize the model ID to match Stripe's approved model list
    const normalizedModelId = normalizeModelId(modelId);

    // Merge provider-level and model-level customer IDs
    const mergedSettings: StripeLanguageModelSettings = {
      customerId: config.customerId,
      ...settings,
    };

    return new StripeLanguageModel(normalizedModelId, mergedSettings, {
      provider: 'stripe',
      baseURL,
      headers: () => {
        const apiKey = config.apiKey || process.env.STRIPE_API_KEY;

        if (!apiKey) {
          throw new Error(
            'Stripe API key is required. Provide it via config.apiKey or STRIPE_API_KEY environment variable.'
          );
        }

        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': `Stripe/v1 @stripe/ai-sdk/provider/0.1.0`,
          ...config.headers,
        };
      },
    });
  };

  const provider = function (
    modelId: string,
    settings?: StripeLanguageModelSettings
  ) {
    if (new.target) {
      throw new Error(
        'The Stripe provider function cannot be called with the new keyword.'
      );
    }

    return createModel(modelId, settings);
  };

  provider.languageModel = createModel;

  // Placeholder implementations for other model types (not yet supported)
  provider.textEmbeddingModel = () => {
    throw new Error('Text embedding models are not yet supported by Stripe provider');
  };

  provider.imageModel = () => {
    throw new Error('Image models are not yet supported by Stripe provider');
  };

  return provider as StripeProvider;
}

/**
 * Default Stripe provider instance
 * Uses STRIPE_API_KEY environment variable for authentication
 *
 * @example
 * ```ts
 * import { stripe } from '@stripe/ai-sdk/provider';
 *
 * const model = stripe('openai/gpt-5', {
 *   customerId: 'cus_xxxxx'
 * });
 * ```
 */
export const stripe = createStripe();

/**
 * Stripe Provider V3 interface
 */
export interface StripeProviderV3 extends ProviderV3 {
  /**
   * Create a V3 language model with the given model ID
   * @param modelId - Model ID in Stripe format (e.g., 'openai/gpt-5', 'google/gemini-2.5-pro')
   * @param settings - Optional settings for the model
   */
  (modelId: string, settings?: StripeLanguageModelSettings): LanguageModelV3;

  /**
   * Create a V3 language model (alias for direct call)
   */
  languageModel(
    modelId: string,
    settings?: StripeLanguageModelSettings
  ): LanguageModelV3;
}

/**
 * Create a Stripe provider V3 instance
 *
 * @param config - Provider configuration options
 * @returns Stripe provider V3 instance
 *
 * @example
 * ```ts
 * import { createStripeV3 } from '@stripe/ai-sdk/provider';
 *
 * const stripeLLM = createStripeV3({
 *   apiKey: process.env.STRIPE_API_KEY,
 *   customerId: 'cus_xxxxx'
 * });
 *
 * const model = stripeLLM('openai/gpt-5');
 * ```
 */
export function createStripeV3(config: StripeProviderConfig = {}): StripeProviderV3 {
  const baseURL = config.baseURL || 'https://llm.stripe.com';

  const createModel = (
    modelId: string,
    settings: StripeLanguageModelSettings = {}
  ): LanguageModelV3 => {
    const normalizedModelId = normalizeModelId(modelId);

    const mergedSettings: StripeLanguageModelSettings = {
      customerId: config.customerId,
      ...settings,
    };

    return new StripeLanguageModelV3(normalizedModelId, mergedSettings, {
      provider: 'stripe',
      baseURL,
      headers: () => {
        const apiKey = config.apiKey || process.env.STRIPE_API_KEY;

        if (!apiKey) {
          throw new Error(
            'Stripe API key is required. Provide it via config.apiKey or STRIPE_API_KEY environment variable.'
          );
        }

        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': `Stripe/v1 @stripe/ai-sdk/provider/0.1.0`,
          ...config.headers,
        };
      },
    });
  };

  const provider = function (
    modelId: string,
    settings?: StripeLanguageModelSettings
  ) {
    if (new.target) {
      throw new Error(
        'The Stripe provider function cannot be called with the new keyword.'
      );
    }

    return createModel(modelId, settings);
  };

  provider.specificationVersion = 'v3' as const;
  provider.languageModel = createModel;

  provider.embeddingModel = () => {
    throw new Error('Embedding models are not yet supported by Stripe provider');
  };

  provider.textEmbeddingModel = () => {
    throw new Error('Text embedding models are not yet supported by Stripe provider');
  };

  provider.imageModel = () => {
    throw new Error('Image models are not yet supported by Stripe provider');
  };

  return provider as unknown as StripeProviderV3;
}

/**
 * Default Stripe provider V3 instance
 * Uses STRIPE_API_KEY environment variable for authentication
 */
export const stripeV3 = createStripeV3();


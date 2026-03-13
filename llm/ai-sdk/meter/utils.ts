/**
 * Utility functions for AI SDK metering
 */

import type {LanguageModelV2StreamPart, LanguageModelV3StreamPart} from '@ai-sdk/provider';
import type {Provider} from './meter-event-types';

/**
 * Determines the provider type from a given model provider string.
 * Normalizes common provider names for consistency in Stripe meter events.
 * 
 * For unknown providers, returns the lowercased provider string as-is.
 */
export function determineProvider(providerString: string): Provider {
  const normalized = providerString.toLowerCase();

  // Normalize common provider names for consistency
  if (normalized.includes('azure')) return 'azure';
  if (normalized.includes('amazon_bedrock') || normalized.includes('bedrock'))
    return 'bedrock';
  if (normalized.includes('huggingface')) return 'huggingface';
  if (normalized.includes('together')) return 'together';
  if (normalized.includes('anthropic')) return 'anthropic';
  if (normalized.includes('google') || normalized.includes('gemini'))
    return 'google';
  if (normalized.includes('groq')) return 'groq';
  if (normalized.includes('openai')) return 'openai';

  // For any other provider, return the lowercased provider name
  return normalized;
}

/**
 * Processes stream chunks to extract usage information
 */
export function extractUsageFromStream(
  chunks: LanguageModelV2StreamPart[]
): {inputTokens: number; outputTokens: number} {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const chunk of chunks) {
    if (chunk.type === 'finish' && chunk.usage) {
      inputTokens = chunk.usage.inputTokens ?? 0;
      outputTokens = chunk.usage.outputTokens ?? 0;
      break; // Usage is typically in the final chunk
    }
  }

  return {inputTokens, outputTokens};
}

/**
 * Processes V3 stream chunks to extract usage information
 */
export function extractUsageFromStreamV3(
  chunks: LanguageModelV3StreamPart[]
): {inputTokens: number; outputTokens: number} {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const chunk of chunks) {
    if (chunk.type === 'finish' && chunk.usage) {
      inputTokens = chunk.usage.inputTokens?.total ?? 0;
      outputTokens = chunk.usage.outputTokens?.total ?? 0;
      break;
    }
  }

  return {inputTokens, outputTokens};
}


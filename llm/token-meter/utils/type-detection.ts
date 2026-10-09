/**
 * Utilities for detecting response types from different AI providers
 */

import type OpenAI from 'openai';
import type {Stream} from 'openai/streaming';
import type Anthropic from '@anthropic-ai/sdk';
import type {Stream as AnthropicStream} from '@anthropic-ai/sdk/streaming';
import type {GenerateContentResult} from '@google/generative-ai';

/**
 * Provider types
 */
export type Provider = 'openai' | 'anthropic' | 'google' | 'unknown';

/**
 * Response type categories
 */
export type ResponseType =
  | 'chat_completion'
  | 'response_api'
  | 'embedding'
  | 'unknown';

/**
 * Detected response information
 */
export interface DetectedResponse {
  provider: Provider;
  type: ResponseType;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Check if response is an OpenAI ChatCompletion
 */
function isOpenAIChatCompletion(response: any): response is OpenAI.ChatCompletion {
  return (
    response &&
    typeof response === 'object' &&
    'choices' in response &&
    'model' in response &&
    response.choices?.[0]?.message !== undefined
  );
}

/**
 * Check if response is an OpenAI Responses API response
 */
function isOpenAIResponse(response: any): response is OpenAI.Responses.Response {
  return (
    response &&
    typeof response === 'object' &&
    'output' in response &&
    'model' in response &&
    'usage' in response &&
    response.usage?.input_tokens !== undefined
  );
}

/**
 * Check if response is an OpenAI Embedding response
 */
function isOpenAIEmbedding(
  response: any
): response is OpenAI.CreateEmbeddingResponse {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'model' in response &&
    Array.isArray(response.data) &&
    response.data?.[0]?.embedding !== undefined
  );
}

/**
 * Check if response is an Anthropic Message
 */
function isAnthropicMessage(
  response: any
): response is Anthropic.Messages.Message {
  return (
    response &&
    typeof response === 'object' &&
    'content' in response &&
    'model' in response &&
    'usage' in response &&
    response.usage?.input_tokens !== undefined &&
    response.usage?.output_tokens !== undefined &&
    response.type === 'message'
  );
}

/**
 * Check if response is a Gemini GenerateContentResult
 */
function isGeminiResponse(response: any): response is GenerateContentResult {
  return (
    response &&
    typeof response === 'object' &&
    'response' in response &&
    response.response?.usageMetadata !== undefined &&
    response.response?.usageMetadata?.promptTokenCount !== undefined
  );
}

/**
 * Detect and extract usage information from a response
 */
export function detectResponse(response: any): DetectedResponse | null {
  // OpenAI Chat Completion
  if (isOpenAIChatCompletion(response)) {
    return {
      provider: 'openai',
      type: 'chat_completion',
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }

  // OpenAI Responses API
  if (isOpenAIResponse(response)) {
    return {
      provider: 'openai',
      type: 'response_api',
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  }

  // OpenAI Embeddings
  if (isOpenAIEmbedding(response)) {
    return {
      provider: 'openai',
      type: 'embedding',
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: 0, // Embeddings don't have output tokens
    };
  }

  // Anthropic Message
  if (isAnthropicMessage(response)) {
    return {
      provider: 'anthropic',
      type: 'chat_completion',
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  }

  // Gemini GenerateContentResult
  if (isGeminiResponse(response)) {
    const usageMetadata = response.response.usageMetadata;
    const baseOutputTokens = usageMetadata?.candidatesTokenCount ?? 0;
    // thoughtsTokenCount is for extended thinking models, may not always be present
    const reasoningTokens = (usageMetadata as any)?.thoughtsTokenCount ?? 0;
    
    // Extract model name from response if available
    const model = (response.response as any)?.modelVersion || 'gemini';

    return {
      provider: 'google',
      type: 'chat_completion',
      model,
      inputTokens: usageMetadata?.promptTokenCount ?? 0,
      outputTokens: baseOutputTokens + reasoningTokens, // Include reasoning tokens
    };
  }

  // Unknown response type
  return null;
}

/**
 * Stream type detection
 */
export type StreamType = 'chat_completion' | 'response_api' | 'unknown';

/**
 * Detect stream type by checking if it has OpenAI stream methods
 * OpenAI streams have 'toReadableStream' method, Anthropic streams don't
 */
export function isOpenAIStream(stream: any): stream is Stream<any> {
  return (
    stream &&
    typeof stream === 'object' &&
    'tee' in stream &&
    'toReadableStream' in stream
  );
}

/**
 * Extract usage from OpenAI chat completion stream chunks
 */
export async function extractUsageFromChatStream(
  stream: Stream<OpenAI.ChatCompletionChunk>
): Promise<DetectedResponse | null> {
  let usage: any = {
    prompt_tokens: 0,
    completion_tokens: 0,
  };
  let model = '';

  try {
    for await (const chunk of stream) {
      if (chunk.model) {
        model = chunk.model;
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
    }

    if (model) {
      return {
        provider: 'openai',
        type: 'chat_completion',
        model,
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
      };
    }
  } catch (error) {
    console.error('Error extracting usage from chat stream:', error);
  }

  return null;
}

/**
 * Extract usage from OpenAI Responses API stream events
 */
export async function extractUsageFromResponseStream(
  stream: Stream<OpenAI.Responses.ResponseStreamEvent>
): Promise<DetectedResponse | null> {
  let usage: any = {
    input_tokens: 0,
    output_tokens: 0,
  };
  let model = '';

  try {
    for await (const chunk of stream) {
      if ('response' in chunk && chunk.response) {
        if (chunk.response.model) {
          model = chunk.response.model;
        }
        if (chunk.response.usage) {
          usage = chunk.response.usage;
        }
      }
    }

    if (model) {
      return {
        provider: 'openai',
        type: 'response_api',
        model,
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
      };
    }
  } catch (error) {
    console.error('Error extracting usage from response stream:', error);
  }

  return null;
}

/**
 * Check if stream is an Anthropic stream
 * Anthropic streams have 'controller' but NOT 'toReadableStream'
 */
export function isAnthropicStream(
  stream: any
): stream is AnthropicStream<Anthropic.Messages.RawMessageStreamEvent> {
  return (
    stream &&
    typeof stream === 'object' &&
    'tee' in stream &&
    'controller' in stream &&
    !('toReadableStream' in stream)
  );
}

/**
 * Extract usage from Anthropic message stream events
 */
export async function extractUsageFromAnthropicStream(
  stream: AnthropicStream<Anthropic.Messages.RawMessageStreamEvent>
): Promise<DetectedResponse | null> {
  const usage: {
    input_tokens: number;
    output_tokens: number;
  } = {
    input_tokens: 0,
    output_tokens: 0,
  };
  let model = '';

  try {
    for await (const chunk of stream) {
      // Capture usage from message_start event (input tokens)
      if (chunk.type === 'message_start') {
        usage.input_tokens = chunk.message.usage.input_tokens ?? 0;
        model = chunk.message.model;
      }
      // Apply cumulative counts, keeping prior input usage when it is omitted.
      if (chunk.type === 'message_delta' && 'usage' in chunk) {
        usage.input_tokens = chunk.usage.input_tokens ?? usage.input_tokens;
        usage.output_tokens = chunk.usage.output_tokens ?? 0;
      }
    }

    if (model) {
      return {
        provider: 'anthropic',
        type: 'chat_completion',
        model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      };
    }
  } catch (error) {
    console.error('Error extracting usage from Anthropic stream:', error);
  }

  return null;
}

/**
 * Check if stream is a Gemini stream
 * Gemini returns an object with {stream, response}, not just a stream
 */
export function isGeminiStream(stream: any): boolean {
  // Gemini returns {stream: AsyncGenerator, response: Promise}
  return (
    stream &&
    typeof stream === 'object' &&
    'stream' in stream &&
    'response' in stream &&
    typeof stream.stream?.[Symbol.asyncIterator] === 'function' &&
    !('tee' in stream)
  );
}

/**
 * Extract usage from Gemini stream
 * Gemini provides an object with both stream and response promise
 */
export async function extractUsageFromGeminiStream(
  streamResult: any
): Promise<DetectedResponse | null> {
  try {
    // Gemini returns {stream, response}
    // We need to consume the stream to get usage
    let lastUsageMetadata: any = null;

    for await (const chunk of streamResult.stream) {
      if (chunk.usageMetadata) {
        lastUsageMetadata = chunk.usageMetadata;
      }
    }

    if (lastUsageMetadata) {
      const baseOutputTokens = lastUsageMetadata?.candidatesTokenCount ?? 0;
      // thoughtsTokenCount is for extended thinking models, may not always be present
      const reasoningTokens = (lastUsageMetadata as any)?.thoughtsTokenCount ?? 0;
      
      // Get model from the response - this field is always present in real Gemini responses
      const response = await streamResult.response;
      const model = (response as any)?.modelVersion;
      
      if (!model) {
        throw new Error('Gemini response is missing modelVersion field. This should never happen with real Gemini API responses.');
      }

      return {
        provider: 'google',
        type: 'chat_completion',
        model,
        inputTokens: lastUsageMetadata?.promptTokenCount ?? 0,
        outputTokens: baseOutputTokens + reasoningTokens,
      };
    }
  } catch (error) {
    console.error('Error extracting usage from Gemini stream:', error);
  }

  return null;
}

/**
 * Detect stream type by examining first chunk (without consuming the stream)
 * This is a heuristic approach - for now we'll try chat completion first,
 * then fall back to response API
 */
export function detectStreamType(_stream: any): StreamType {
  // For now, we'll assume chat completion by default
  // In the future, we could peek at the first chunk to determine type
  return 'chat_completion';
}


/**
 * Utility functions for Stripe AI SDK Provider
 */

import {
  LanguageModelV2Prompt,
  LanguageModelV2FinishReason,
} from '@ai-sdk/provider';
import {uint8ArrayToBase64} from './base64';

type AssistantMessage = Extract<
  LanguageModelV2Prompt[number],
  {role: 'assistant'}
>;
type UserMessage = Extract<LanguageModelV2Prompt[number], {role: 'user'}>;

type AssistantContentPart = AssistantMessage['content'][number];
type UserContentPart = UserMessage['content'][number];

/**
 * Type guards for content parts
 */
function isTextPart(
  part: AssistantContentPart
): part is Extract<AssistantContentPart, {type: 'text'}> {
  return part.type === 'text';
}

function isToolCallPart(
  part: AssistantContentPart
): part is Extract<AssistantContentPart, {type: 'tool-call'}> {
  return part.type === 'tool-call';
}

function isUserTextPart(
  part: UserContentPart
): part is Extract<UserContentPart, {type: 'text'}> {
  return part.type === 'text';
}

function isUserFilePart(
  part: UserContentPart
): part is Extract<UserContentPart, {type: 'file'}> {
  return part.type === 'file';
}

/**
 * Converts AI SDK V2 prompt to OpenAI-compatible messages format
 */
export function convertToOpenAIMessages(
  prompt: LanguageModelV2Prompt
): Array<{
  role: string;
  content:
    | string
    | Array<{
        type: string;
        text?: string;
        image_url?: {url: string};
      }>;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {name: string; arguments: string};
  }>;
  tool_call_id?: string;
  name?: string;
}> {
  return prompt.map((message) => {
    switch (message.role) {
      case 'system':
        return [{
          role: 'system',
          content: message.content,
        }];

      case 'user': {
        const contentParts = message.content.map((part) => {
          if (isUserTextPart(part)) {
            return {
              type: 'text',
              text: part.text,
            };
          } else if (isUserFilePart(part)) {
            // Convert file data to data URL if needed
            let fileUrl: string;
            if (typeof part.data === 'string') {
              // Could be a URL or base64 data
              if (part.data.startsWith('http://') || part.data.startsWith('https://')) {
                fileUrl = part.data;
              } else {
                // Assume it's base64
                fileUrl = `data:${part.mediaType};base64,${part.data}`;
              }
            } else if (part.data instanceof URL) {
              fileUrl = part.data.toString();
            } else {
              // Convert Uint8Array to base64 data URL
              const base64 = uint8ArrayToBase64(part.data);
              fileUrl = `data:${part.mediaType};base64,${base64}`;
            }
            
            // For images, use image_url format
            if (part.mediaType.startsWith('image/')) {
              return {
                type: 'image_url',
                image_url: {url: fileUrl},
              };
            }
            
            // For other file types, use text representation
            // (OpenAI format doesn't support arbitrary file types well)
            return {
              type: 'text',
              text: `[File: ${part.filename || 'unknown'}, type: ${part.mediaType}]`,
            };
          } else {
            // TypeScript should prevent this, but handle it for runtime safety
            const _exhaustiveCheck: never = part;
            throw new Error(`Unsupported user message part type`);
          }
        });

        // If there's only one text part, send as a simple string
        // This is more compatible with Anthropic's requirements
        const content = 
          contentParts.length === 1 && contentParts[0].type === 'text'
            ? contentParts[0].text!
            : contentParts;

        return [{
          role: 'user',
          content,
        }];
      }

      case 'assistant': {
        // Extract text content
        const textParts = message.content.filter(isTextPart);
        const textContent = textParts.length > 0
          ? textParts.map((part) => part.text).join('')
          : '';

        // Extract tool calls
        const toolCallParts = message.content.filter(isToolCallPart);
        const toolCalls = toolCallParts.length > 0
          ? toolCallParts.map((part) => ({
              id: part.toolCallId,
              type: 'function' as const,
              function: {
                name: part.toolName,
                arguments:
                  typeof part.input === 'string'
                    ? part.input
                    : JSON.stringify(part.input),
              },
            }))
          : undefined;

        return [{
          role: 'assistant',
          content: textContent || (toolCalls ? '' : ''),
          tool_calls: toolCalls,
        }];
      }

      case 'tool':
        // In OpenAI format, each tool result is a separate message
        // Note: This returns an array, so we need to flatten it later
        return message.content.map((part) => {
          let content: string;
          
          // Handle different output types
          if (part.output.type === 'text') {
            content = part.output.value;
          } else if (part.output.type === 'json') {
            content = JSON.stringify(part.output.value);
          } else if (part.output.type === 'error-text') {
            content = `Error: ${part.output.value}`;
          } else if (part.output.type === 'error-json') {
            content = `Error: ${JSON.stringify(part.output.value)}`;
          } else if (part.output.type === 'content') {
            // Convert content array to string
            content = part.output.value
              .map((item) => {
                if (item.type === 'text') {
                  return item.text;
                } else if (item.type === 'media') {
                  return `[Media: ${item.mediaType}]`;
                }
                return '';
              })
              .join('\n');
          } else {
            content = String(part.output);
          }

          return {
            role: 'tool',
            tool_call_id: part.toolCallId,
            name: part.toolName,
            content,
          };
        });

      default:
        // TypeScript should ensure we never get here, but just in case
        const exhaustiveCheck: never = message;
        throw new Error(`Unsupported message role: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }).flat();
}

/**
 * Maps OpenAI finish reasons to AI SDK V2 finish reasons
 */
export function mapOpenAIFinishReason(
  finishReason: string | null | undefined
): LanguageModelV2FinishReason {
  switch (finishReason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'content_filter':
      return 'content-filter';
    case 'tool_calls':
    case 'function_call':
      return 'tool-calls';
    default:
      return 'unknown';
  }
}

/**
 * Normalize model names to match Stripe's approved model list
 * This function handles provider-specific normalization rules:
 * - Anthropic: Removes date suffixes, -latest suffix, converts version dashes to dots
 * - OpenAI: Removes date suffixes (with exceptions)
 * - Google: Returns as-is
 * 
 * @param modelId - Model ID in provider/model format (e.g., 'anthropic/claude-3-5-sonnet-20241022')
 * @returns Normalized model ID in the same format
 */
export function normalizeModelId(modelId: string): string {
  // Split the model ID into provider and model parts
  const parts = modelId.split('/');
  if (parts.length !== 2) {
    // If format is not provider/model, return as-is
    return modelId;
  }

  const [provider, model] = parts;
  const normalizedProvider = provider.toLowerCase();
  let normalizedModel = model;

  if (normalizedProvider === 'anthropic') {
    // Remove date suffix (YYYYMMDD format at the end)
    normalizedModel = normalizedModel.replace(/-\d{8}$/, '');

    // Remove -latest suffix
    normalizedModel = normalizedModel.replace(/-latest$/, '');

    // Convert version number dashes to dots anywhere in the name
    // Match patterns like claude-3-7, opus-4-1, sonnet-4-5, etc.
    normalizedModel = normalizedModel.replace(/(-[a-z]+)?-(\d+)-(\d+)/g, '$1-$2.$3');
  } else if (normalizedProvider === 'openai') {
    // Exception: keep gpt-4o-2024-05-13 as is
    if (normalizedModel === 'gpt-4o-2024-05-13') {
      return modelId;
    }

    // Remove date suffix in format -YYYY-MM-DD
    normalizedModel = normalizedModel.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  }
  // For other providers (google/gemini), return as is

  return `${provider}/${normalizedModel}`;
}

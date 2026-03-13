/**
 * Utility functions for Stripe AI SDK Provider (V3 specification)
 */

import type {
  LanguageModelV3Prompt,
  LanguageModelV3FinishReason,
} from '@ai-sdk/provider';

type AssistantMessage = Extract<
  LanguageModelV3Prompt[number],
  {role: 'assistant'}
>;
type UserMessage = Extract<LanguageModelV3Prompt[number], {role: 'user'}>;
type ToolMessage = Extract<LanguageModelV3Prompt[number], {role: 'tool'}>;

type AssistantContentPart = AssistantMessage['content'][number];
type UserContentPart = UserMessage['content'][number];
type ToolContentPart = ToolMessage['content'][number];

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
 * Converts AI SDK V3 prompt to OpenAI-compatible messages format
 */
export function convertToOpenAIMessagesV3(
  prompt: LanguageModelV3Prompt
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
  return prompt
    .map((message) => {
      switch (message.role) {
        case 'system':
          return [
            {
              role: 'system',
              content: message.content,
            },
          ];

        case 'user': {
          const contentParts = message.content.map((part) => {
            if (isUserTextPart(part)) {
              return {
                type: 'text',
                text: part.text,
              };
            } else if (isUserFilePart(part)) {
              let fileUrl: string;
              if (typeof part.data === 'string') {
                if (
                  part.data.startsWith('http://') ||
                  part.data.startsWith('https://')
                ) {
                  fileUrl = part.data;
                } else {
                  fileUrl = `data:${part.mediaType};base64,${part.data}`;
                }
              } else if (part.data instanceof URL) {
                fileUrl = part.data.toString();
              } else {
                const base64 = btoa(
                  String.fromCharCode(...Array.from(part.data))
                );
                fileUrl = `data:${part.mediaType};base64,${base64}`;
              }

              if (part.mediaType.startsWith('image/')) {
                return {
                  type: 'image_url',
                  image_url: {url: fileUrl},
                };
              }

              return {
                type: 'text',
                text: `[File: ${part.filename || 'unknown'}, type: ${part.mediaType}]`,
              };
            } else {
              const _exhaustiveCheck: never = part;
              throw new Error(`Unsupported user message part type`);
            }
          });

          const content =
            contentParts.length === 1 && contentParts[0].type === 'text'
              ? contentParts[0].text!
              : contentParts;

          return [
            {
              role: 'user',
              content,
            },
          ];
        }

        case 'assistant': {
          const textParts = message.content.filter(isTextPart);
          const textContent =
            textParts.length > 0
              ? textParts.map((part) => part.text).join('')
              : '';

          const toolCallParts = message.content.filter(isToolCallPart);
          const toolCalls =
            toolCallParts.length > 0
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

          return [
            {
              role: 'assistant',
              content: textContent || (toolCalls ? '' : ''),
              tool_calls: toolCalls,
            },
          ];
        }

        case 'tool':
          return message.content
            .filter(
              (part): part is Extract<ToolContentPart, {type: 'tool-result'}> =>
                part.type === 'tool-result'
            )
            .map((part) => {
              let content: string;

              if (part.output.type === 'text') {
                content = part.output.value;
              } else if (part.output.type === 'json') {
                content = JSON.stringify(part.output.value);
              } else if (part.output.type === 'error-text') {
                content = `Error: ${part.output.value}`;
              } else if (part.output.type === 'error-json') {
                content = `Error: ${JSON.stringify(part.output.value)}`;
              } else if (part.output.type === 'content') {
                content = part.output.value
                  .map((item: any) => {
                    if (item.type === 'text') {
                      return item.text;
                    } else if (
                      item.type === 'file-data' ||
                      item.type === 'file-url' ||
                      item.type === 'file-id'
                    ) {
                      return `[File: ${item.type}]`;
                    } else if (item.type === 'image-data') {
                      return `[Image: ${item.mediaType}]`;
                    }
                    return '';
                  })
                  .join('\n');
              } else if (part.output.type === 'execution-denied') {
                content = `Execution denied${(part.output as any).reason ? ': ' + (part.output as any).reason : ''}`;
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
          const exhaustiveCheck: never = message;
          throw new Error(
            `Unsupported message role: ${JSON.stringify(exhaustiveCheck)}`
          );
      }
    })
    .flat();
}

/**
 * Maps OpenAI finish reasons to AI SDK V3 finish reasons
 */
export function mapOpenAIFinishReasonV3(
  finishReason: string | null | undefined
): LanguageModelV3FinishReason {
  let unified: LanguageModelV3FinishReason['unified'];

  switch (finishReason) {
    case 'stop':
      unified = 'stop';
      break;
    case 'length':
      unified = 'length';
      break;
    case 'content_filter':
      unified = 'content-filter';
      break;
    case 'tool_calls':
    case 'function_call':
      unified = 'tool-calls';
      break;
    default:
      unified = 'other';
      break;
  }

  return {
    unified,
    raw: finishReason ?? undefined,
  };
}

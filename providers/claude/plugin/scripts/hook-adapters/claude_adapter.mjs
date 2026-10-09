import {
    ADD_CONTEXT,
    BLOCK,
    SESSION_START,
    TOOL_COMPLETED,
    TOOL_FAILED,
    TOOL_BATCH_COMPLETED,
    USER_PROMPT_SUBMITTED,
} from '../constants.mjs';
import { normalizeToolCall, validBatchCalls } from '../hookHelpers.mjs';


const CLAUDE_EVENTS  = {
  [SESSION_START]: { nativeHookName: 'SessionStart'},
  [TOOL_COMPLETED]: { nativeHookName: 'PostToolUse'},
  [TOOL_FAILED]: { nativeHookName: 'PostToolUseFailure'},
  [TOOL_BATCH_COMPLETED]: { nativeHookName: 'PostToolBatch' },
  [USER_PROMPT_SUBMITTED]: { nativeHookName: 'UserPromptSubmit' },
};

function valueAsText(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return JSON.stringify(value);
}

function contentBlockAsText(block) {
  if (typeof block === 'string') {
    return block;
  }
  if (!block || typeof block !== 'object') {
    return '';
  }

  if (block.type === 'text') {
    return valueAsText(block.text);
  }
  if (block.type === 'tool_use') {
    return `${valueAsText(block.name)}\n${valueAsText(block.input)}`;
  }
  if (block.type === 'tool_result') {
    return contentAsText(block.content);
  }
  return '';
}

function contentAsText(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content.map(contentBlockAsText).join('\n');
}

function hookOutputAsText(attachment) {
  if (
    typeof attachment?.type !== 'string' ||
    !attachment.type.startsWith('hook_')
  ) {
    return '';
  }

  return [attachment.content, attachment.stdout, attachment.stderr]
    .map(valueAsText)
    .join('\n');
}

function transcriptEntryText(entry) {
  return [
    contentAsText(entry?.message?.content),
    hookOutputAsText(entry?.attachment),
  ].join('\n');
}

function isHumanPromptEntry(entry) {
  if (
    entry?.type !== 'user' ||
    entry.isMeta === true ||
    entry.isSynthetic === true
  ) {
    return false;
  }

  const content = entry.message?.content;
  if (typeof content === 'string') {
    return true;
  }
  return (
    Array.isArray(content) &&
    content.some((block) => block?.type !== 'tool_result')
  );
}

export function normalizeClaudeEvent(eventType, raw) {
  switch (eventType) {
    case SESSION_START:
      return {new_session: raw?.source === 'startup'} ;
    case TOOL_COMPLETED:
    case TOOL_FAILED:
      return { tool: normalizeToolCall(raw?.tool_input, raw?.tool_name, raw?.tool_response) };
    case TOOL_BATCH_COMPLETED:
      return {
        tools: validBatchCalls(raw?.tool_calls).map((call) =>
          normalizeToolCall(call.tool_input, call.tool_name, call.tool_response),
        ),
      };
    case USER_PROMPT_SUBMITTED:
      return {
        transcriptPath: raw?.transcript_path,
        lastAssistantMessage: raw?.last_assistant_message,
      };
    default:
      throw new Error(`Unsupported event type: ${eventType}`);
  }
}

export function normalizeClaudeTranscriptEntry(raw) {
  return {
    text: transcriptEntryText(raw),
    isHumanPrompt: isHumanPromptEntry(raw),
  };
}

export function serializeClaudeHookOutput(eventType, eventOutput) {
  const nativeHookName = CLAUDE_EVENTS[eventType]?.nativeHookName;
  if (!nativeHookName) {
    throw new Error(`Unsupported event type: ${eventType}`);
  }

  switch (eventOutput.outputType) {
    case ADD_CONTEXT:
      return {
        hookSpecificOutput: {
          hookEventName: nativeHookName,
          additionalContext: eventOutput.message,
        },
      };
    case BLOCK:
      return {
        decision: 'block',
        reason: eventOutput.message,
      };
    default:
      throw new Error(`Unsupported type of hook output: ${eventOutput.outputType}`);
  }
}

export const CLAUDE = {
  normalizeEvent: normalizeClaudeEvent,
  normalizeTranscriptEntry: normalizeClaudeTranscriptEntry,
  serializeHookOutput: serializeClaudeHookOutput,
};
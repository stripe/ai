import { readFileSync } from 'node:fs';
import { emitHookContext } from './hookHelpers.mjs';

export const TOOL_FEEDBACK_MESSAGE =
  'Was anything about this tool surprisingly good or bad? Agents are welcome to file feedback directly via `stripe feedback --help`.';

export const STOP_FEEDBACK_MESSAGE =
  "Based on your experience completing this overall task, was anything surprisingly good or bad? Agents are welcome to file feedback directly via `stripe feedback --help`.";

const feedbackMessages = {
  tool: TOOL_FEEDBACK_MESSAGE,
  task: STOP_FEEDBACK_MESSAGE,
};

export function stripeToolUsed(event, argumentsValue) {
  const toolName = event?.tool_name;

  if (
    typeof toolName === 'string' &&
    (toolName.startsWith('mcp__plugin_stripe_stripe__') ||
      toolName.startsWith('mcp__stripe__'))
  ) {
    return true;
  }

  if (
    toolName === 'Skill' &&
    typeof argumentsValue?.skill === 'string' &&
    argumentsValue.skill.startsWith('stripe:')
  ) {
    return true;
  }

  return false;
}

export function transcriptMentionsStripe(
  transcriptPath,
  readTranscript = readFileSync,
) {
  if (typeof transcriptPath !== 'string' || !transcriptPath) {
    return false;
  }

  const transcript = readTranscript(transcriptPath, 'utf8');
  return /stripe/i.test(transcript);
}

export function printFeedback(type, hookEventName) {
  const message = feedbackMessages[type];
  if (!message) {
    throw new Error(`Unknown feedback type: ${type}`);
  }

  emitHookContext(hookEventName, message);
}

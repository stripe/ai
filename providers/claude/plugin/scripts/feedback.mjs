import { emitHookContext } from './hookHelpers.mjs';
import { lastTurnMentioned } from './transcriptHelpers.mjs';

export const TOOL_FEEDBACK_MESSAGE =
  "Was anything about this Stripe tool surprisingly good or bad from your " +
  "perspective? Stripe values first-hand observations from agents using its " +
  "tools. If this call produced something worth sharing, consider reporting it " +
  "before finishing this turn: run `stripe feedback --help`, then submit feedback " +
  "grounded in what happened. Otherwise, continue normally.";

export const STOP_FEEDBACK_MESSAGE =
  "Looking back on this Stripe-related task, was anything surprisingly good or " +
  "bad from your perspective? Stripe values first-hand observations from agents " +
  "using its tools. If this session produced something worth sharing, consider " +
  "reporting it while the experience is fresh: run `stripe feedback --help`, " +
  "then submit feedback grounded in what happened. Otherwise, finish normally.";

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

export function stripeMentionedInLastTurn(event) {
  return lastTurnMentioned(/stripe/i, event);
}

export function printFeedback(type, hookEventName) {
  const message = feedbackMessages[type];
  if (!message) {
    throw new Error(`Unknown feedback type: ${type}`);
  }

  emitHookContext(hookEventName, message);
}

import { lastTurnMentioned } from './transcriptHelpers.mjs';

export const FEEDBACK_CRITERIA_SENTENCE =
  'Stripe aims to make powerful, intuitive, and delightful products; it should be easy to infer the right way of doing things. ' +
  'We enthusiastically encourage agents to give us feedback when we fall short (or do surprisingly well). ' +
  'Good feedback is "ticket-ready": include reproduction steps, desired vs observed behavior, and what was surprisingly good or bad. ' +
  "Make sure to explain the user's underlying goal and context: understanding the problem behind the problem may help us identify a better strategy altogether.";
export const FEEDBACK_COMMAND_EXAMPLE_SENTENCE =
  'For example: `stripe feedback --json --sentiment neutral ' +
  '--message "..." ' +
  '--context "..." ' +
  '--feature docs`.';
export const FEEDBACK_OPTIONS_SENTENCE =
  'Use positive, neutral, or negative honestly. Set `--feature` to the ' +
  'affected product area; use `skills` for skill feedback or `other` when ' +
  'none fits. `stripe feedback --help` lists every option.';
export const USER_APPROVAL_SENTENCE =
  'Before submitting, show the prospective feedback to the user and ask for approval, ' +
  'mentioning that they may be invited to a private beta if Stripe is developing a solution to their problem.';
export const CONTINUE_USER_TASK_SENTENCE =
  "Then continue the user's task.";
export const CONTINUE_WITH_NEW_MESSAGE_SENTENCE =
  "Then continue by responding to the user's new message.";

export const PER_BATCH_FEEDBACK_MESSAGE = composeFeedbackMessage(
  'Assess the Stripe skills, MCP tools, or APIs used in this batch.',
  FEEDBACK_CRITERIA_SENTENCE,
  FEEDBACK_COMMAND_EXAMPLE_SENTENCE,
  FEEDBACK_OPTIONS_SENTENCE,
  CONTINUE_USER_TASK_SENTENCE,
  USER_APPROVAL_SENTENCE,
);

export const TOOL_FAILURE_FEEDBACK_MESSAGE = composeFeedbackMessage(
  'The Stripe tool failed.',
  FEEDBACK_CRITERIA_SENTENCE,
  FEEDBACK_COMMAND_EXAMPLE_SENTENCE,
  FEEDBACK_OPTIONS_SENTENCE,
  'Then continue resolving the failure and the user\'s task.',
  USER_APPROVAL_SENTENCE,
);

export const AGENT_FEEDBACK_MESSAGE = composeFeedbackMessage(
  "Assess the completed subagent's Stripe-related work.",
  FEEDBACK_CRITERIA_SENTENCE,
  FEEDBACK_COMMAND_EXAMPLE_SENTENCE,
  FEEDBACK_OPTIONS_SENTENCE,
  CONTINUE_USER_TASK_SENTENCE,
  USER_APPROVAL_SENTENCE,
);

export const PER_TURN_FEEDBACK_MESSAGE = composeFeedbackMessage(
  'Assess the preceding Stripe work before handling the new message.',
  FEEDBACK_CRITERIA_SENTENCE,
  FEEDBACK_COMMAND_EXAMPLE_SENTENCE,
  FEEDBACK_OPTIONS_SENTENCE,
  CONTINUE_WITH_NEW_MESSAGE_SENTENCE,
  USER_APPROVAL_SENTENCE,
);

export function composeFeedbackMessage(...sentences) {
  return sentences.filter(Boolean).join('\n\n');
}

export function isStripeToolCall(event, argumentsValue) {
  const toolName = event?.tool_name;

  if (
    typeof toolName === 'string' &&
    (toolName.startsWith('mcp__plugin_stripe_stripe__') ||
      toolName.startsWith('mcp__stripe__'))
  ) {
    return true;
  }

  return getStripeSkillName(event, argumentsValue) !== undefined;
}

export function batchIncludesStripeTool(event) {
  return batchToolCalls(event).some((call) =>
    isStripeToolCall(call, call.tool_input),
  );
}

export function batchIncludesFailedStripeTool(event) {
  return batchToolCalls(event).some(
    (call) =>
      isStripeToolCall(call, call.tool_input) &&
      toolResponseLooksFailed(call.tool_response),
  );
}

// Metronome work often never says "stripe" by name.
const STRIPE_MENTION_PATTERN = /stripe|metronome/i;

export function completedAgentWorkMentionsStripe(event) {
  return (
    event?.tool_name === 'Agent' &&
    event?.tool_response?.status === 'completed' &&
    valuesMention(
      STRIPE_MENTION_PATTERN,
      event.tool_input?.prompt,
      event.tool_response?.content,
    )
  );
}

export function getStripeSkillName(event, argumentsValue) {
  const skillName = argumentsValue?.skill;
  if (
    event?.tool_name !== 'Skill' ||
    typeof skillName !== 'string' ||
    !skillName.startsWith('stripe:')
  ) {
    return undefined;
  }

  return skillName.slice('stripe:'.length);
}

export function shouldEmitPerTurnFeedback(event) {
  return lastTurnMentioned(STRIPE_MENTION_PATTERN, event);
}

function batchToolCalls(event) {
  return Array.isArray(event?.tool_calls)
    ? event.tool_calls.filter(
        (call) => call && typeof call === 'object',
      )
    : [];
}

function toolResponseLooksFailed(response) {
  if (Array.isArray(response)) {
    return response.some(toolResponseLooksFailed);
  }
  if (response && typeof response === 'object') {
    return (
      response.is_error === true ||
      response.isError === true ||
      toolResponseLooksFailed(response.error) ||
      toolResponseLooksFailed(response.content)
    );
  }
  return (
    typeof response === 'string' &&
    /^(?:error\b|exit code \d+\b|mcp error\b|tool use error\b|<tool_use_error>)/i.test(
      response.trimStart(),
    )
  );
}

function valuesMention(pattern, ...values) {
  return values.some((value) => {
    pattern.lastIndex = 0;
    return pattern.test(
      typeof value === 'string' ? value : JSON.stringify(value ?? ''),
    );
  });
}

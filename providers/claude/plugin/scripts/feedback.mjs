import { lastTurnMentioned } from './transcriptHelpers.mjs';

export const FEEDBACK_CRITERIA_SENTENCE =
  'If it was useful, confusing, wrong, or incomplete, send Stripe feedback. ' +
  "If Stripe is developing a solution to the user's problem, we may invite them to a private beta.";
export const FEEDBACK_COMMAND_EXAMPLE_SENTENCE =
  'For example: `stripe feedback --json --sentiment neutral ' +
  '--message "The documentation search omitted webhook retry guidance" ' +
  '--context "Helping a user implement Checkout webhook retries" ' +
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
  'If any were useful, confusing, wrong, or incomplete, send Stripe feedback. ' +
    "If Stripe is developing a solution to the user's problem, we may invite them to a private beta.",
  FEEDBACK_COMMAND_EXAMPLE_SENTENCE,
  FEEDBACK_OPTIONS_SENTENCE,
  CONTINUE_USER_TASK_SENTENCE,
  USER_APPROVAL_SENTENCE,
);

export const TOOL_FAILURE_FEEDBACK_MESSAGE = composeFeedbackMessage(
  'The Stripe tool failed. Send Stripe feedback explaining what you were trying to do and what failed. ' +
    "If Stripe is developing a solution to the user's problem, we may invite them to a private beta.",
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
  return sentences.filter(Boolean).join(' ');
}

// Metronome work often never says "stripe" by name.
const STRIPE_MENTION_PATTERN = /stripe|metronome/i;

export function completedAgentWorkMentionsStripe(tool) {
  return (
    tool.agentWork?.completed === true &&
    valuesMention(
      STRIPE_MENTION_PATTERN,
      tool.agentWork.prompt,
      tool.agentWork.content,
    )
  );
}

export function shouldEmitPerTurnFeedback(event, adapter) {
  return lastTurnMentioned(STRIPE_MENTION_PATTERN, event, adapter);
}

function valuesMention(pattern, ...values) {
  return values.some((value) => {
    pattern.lastIndex = 0;
    return pattern.test(
      typeof value === 'string' ? value : JSON.stringify(value ?? ''),
    );
  });
}

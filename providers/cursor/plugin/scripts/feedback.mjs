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

const STRIPE_TOOLS_WITHOUT_STRIPE_IN_NAME = [
  'MCP:list_available_accounts_or_orgs',
  'MCP:atlas_company_formation',
];

export function composeFeedbackMessage(...sentences) {
  return sentences.filter(Boolean).join(' ');
}

export function isStripeToolCall(event, argumentsValue) {
  const toolName = event?.tool_name;

  if (
    typeof toolName === 'string' &&
    toolName.startsWith('MCP:') &&
    (toolName.includes('stripe') ||
      STRIPE_TOOLS_WITHOUT_STRIPE_IN_NAME.includes(toolName))
  ) {
    return true;
  }

  return (
    getStripeSkillName(toolName, argumentsValue?.file_path) !== undefined
  );
}

// Metronome work often never says "stripe" by name.
const STRIPE_MENTION_PATTERN = /stripe|metronome/i;

export function completedAgentWorkMentionsStripe(event) {
  const toolOutput = JSON.parse(event.tool_output);
  if (
    toolOutput === null ||
    Array.isArray(toolOutput) ||
    typeof toolOutput !== 'object'
  ) {
    throw new Error('Tool output must be a JSON object');
  }
  return (
    (event?.tool_name === 'Task' ||
      event?.tool_name === 'Subagent' ||
      event?.tool_name === 'mcp_task') &&
    toolOutput?.status === 'success' &&
    valuesMention(
      STRIPE_MENTION_PATTERN,
      event.tool_input?.prompt,
      toolOutput?.content,
    )
  );
}

export function getStripeSkillName(toolName, filePath) {
  // This checks if the SKILL.md file for the stripe skill was read
  const skillFilepath = (filePath ?? '').replace(/\\/g, '/');
  const isStripeSkill =
    skillFilepath.includes('stripe') && skillFilepath.includes('SKILL.md');

  if (toolName !== 'Read' || !isStripeSkill) {
    return undefined;
  }

  return skillFilepath.split('/').at(-2);
}

function valuesMention(pattern, ...values) {
  return values.some((value) => {
    pattern.lastIndex = 0;
    return pattern.test(
      typeof value === 'string' ? value : JSON.stringify(value ?? ''),
    );
  });
}

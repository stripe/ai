import { reportSkillUsage } from './cli.mjs';

const STRIPE_MCP_PREFIXES = ['mcp__plugin_stripe_stripe__', 'mcp__stripe__'];

function getHookArguments(toolInput) {
  return toolInput !== null &&
    !Array.isArray(toolInput) &&
    typeof toolInput === 'object'
    ? toolInput
    : {};
}

function getStripeSkillName(toolName, argumentsValue) {
  const skillName = argumentsValue?.skill;
  if (
    toolName !== 'Skill' ||
    typeof skillName !== 'string' ||
    !skillName.startsWith('stripe:')
  ) {
    return undefined;
  }
  return skillName.slice('stripe:'.length);
}

function isStripeToolCall(toolName, stripeSkillName) {
  if (
    typeof toolName === 'string' &&
    STRIPE_MCP_PREFIXES.some((prefix) => toolName.startsWith(prefix))
  ) {
    return true;
  }
  return stripeSkillName !== undefined;
}

function toolResponseFailed(response) {
  if (Array.isArray(response)) {
    return response.some(toolResponseFailed);
  }
  if (response && typeof response === 'object') {
    return (
      response.is_error === true ||
      response.isError === true ||
      toolResponseFailed(response.error) ||
      toolResponseFailed(response.content)
    );
  }
  return (
    typeof response === 'string' &&
    /^(?:error\b|exit code \d+\b|mcp error\b|tool use error\b|<tool_use_error>)/i.test(
      response.trimStart(),
    )
  );
}

export function normalizeToolCall(toolInput, toolName, toolResponse) {
  const input = getHookArguments(toolInput);
  const stripeSkillName = getStripeSkillName(toolName, input);
  const agentWork =
    toolName === 'Agent'
      ? {
          completed: toolResponse?.status === 'completed',
          prompt: toolInput?.prompt,
          content: toolResponse?.content,
        }
      : undefined;

  return {
    name: typeof toolName === 'string' ? toolName : undefined,
    input,
    output: toolResponse,
    isStripeTool: isStripeToolCall(toolName, stripeSkillName),
    stripeSkillName,
    failed: toolResponseFailed(toolResponse),
    agentWork,
  };
}

export function validBatchCalls(tool_calls) {
  if (tool_calls === null) {
    return []
  }
  return Array.isArray(tool_calls)
    ? tool_calls.filter((call) => call && typeof call === 'object')
    : [];
}

export async function readHookEvent(input = process.stdin) {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawEvent = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawEvent) {
    throw new Error('Hook event input is empty');
  }

  const event = JSON.parse(rawEvent);
  if (event === null || Array.isArray(event) || typeof event !== 'object') {
    throw new Error('Hook event must be a JSON object');
  }
  return event;
}

export function sample(rate, random = Math.random) {
  return random() < rate;
}

export async function runHook(callback) {
  try {
    await callback();
  } catch {
    // Feedback guidance must never interrupt the agent's work.
  }
}

export function executeHookOutput(adapter, eventType, eventOutput) {
  if (eventOutput != null) {
    const output = adapter.serializeHookOutput(eventType, eventOutput);
    process.stdout.write(JSON.stringify(output));
  }
}

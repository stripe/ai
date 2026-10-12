import { 
  getStripeCliGuidance,
  reportSkillUsage,
} from './cli.mjs';
import {
  ADD_CONTEXT,
  BLOCK,
  PER_TOOL_FEEDBACK_SAMPLE_RATE,
  PER_TURN_FEEDBACK_SAMPLE_RATE,
} from './constants.mjs';
import {
  AGENT_FEEDBACK_MESSAGE,
  completedAgentWorkMentionsStripe,
  PER_BATCH_FEEDBACK_MESSAGE,
  PER_TURN_FEEDBACK_MESSAGE,
  shouldEmitPerTurnFeedback,
  TOOL_FAILURE_FEEDBACK_MESSAGE,
} from './feedback.mjs';
import { executeHookOutput, readHookEvent, runHook, sample } from './hookHelpers.mjs';
import { getAdapter } from './hook-adapters/adapter.mjs';

export function handleSessionStart(event) {
  if (event.new_session) {
    const message = getStripeCliGuidance();
    return message ? { outputType: ADD_CONTEXT, message } : null;
  }
  return null;
}

export function handleToolCompleted(event) {
  const skillName = event.tool.stripeSkillName;
  if (skillName) {
    reportSkillUsage(skillName);
  }

  if (
    completedAgentWorkMentionsStripe(event.tool) &&
    sample(PER_TOOL_FEEDBACK_SAMPLE_RATE)
  ) {
    return { outputType: ADD_CONTEXT, message: AGENT_FEEDBACK_MESSAGE };
  }

  return null;
}

export function handleToolFailed(event) {
  return event.tool.isStripeTool
    ? { outputType: BLOCK, message: TOOL_FAILURE_FEEDBACK_MESSAGE } : null;
}

export function handleToolBatchCompleted(event) {
  const tools = event.tools;
  const batchIncludesStripeTool = tools.some((tool) => tool.isStripeTool);
  const batchIncludesFailedStripeTool = tools.some((tool) => tool.isStripeTool && tool.failed);
  if (
    batchIncludesStripeTool &&
    !batchIncludesFailedStripeTool &&
    sample(PER_TOOL_FEEDBACK_SAMPLE_RATE)
  ) {
    return { outputType: ADD_CONTEXT, message: PER_BATCH_FEEDBACK_MESSAGE };
  }
  return null;
}

export function handlePromptSubmitted(event, adapter) {
  if (sample(PER_TURN_FEEDBACK_SAMPLE_RATE) && shouldEmitPerTurnFeedback(event, adapter)) {
    return { outputType: ADD_CONTEXT, message: PER_TURN_FEEDBACK_MESSAGE };
  }
  return null;
}

export async function runLifecycleHook({ provider, eventType, handler }) {
  await runHook(async () => {
    const adapter = getAdapter(provider);
    const raw = await readHookEvent();
    const event = adapter.normalizeEvent(eventType, raw);

    const eventOutput = (await handler(event, adapter));
    executeHookOutput(adapter, eventType, eventOutput);
  });
}
import {
  agentWorkMentions,
  batchIncludesFailedStripeTool,
  batchIncludesStripeTool,
  batchWorkMentions,
  isStripeToolCall,
  toolWorkMentions,
} from './feedback.mjs';
import { getHookArguments, sample } from './hookHelpers.mjs';
import { lastTurnMentioned } from './transcriptHelpers.mjs';

// Tune feedback sampling here. Unmatched events use defaultRate; baseRate is
// only used by matching multiplier rules. The last matching rule wins.
export const feedbackSampling = {
  defaultRate: 0,
  sampleRules: [
    {
      matches: ({ checkEvent }) => checkEvent(/stripe/i),
      multiplier: 1,
    },
    {
      matches: ({ checkEvent }) => checkEvent(/metronome/i),
      multiplier: 10,
    },
    // For testing, append a rule with rate: 1 instead of a multiplier.
    // Exact rates still respect eventConditions.
  ],
  events: {
    PostToolBatch: {
      eventConditions: (event) =>
        batchIncludesStripeTool(event) &&
        !batchIncludesFailedStripeTool(event),
      baseRate: 0.001,
      checkEvent: batchWorkMentions,
    },
    PostToolUse: {
      eventConditions: (event) =>
        event.tool_name === 'Agent' &&
        event.tool_response?.status === 'completed',
      baseRate: 0.001,
      checkEvent: agentWorkMentions,
    },
    PostToolUseFailure: {
      eventConditions: (event) =>
        isStripeToolCall(event, getHookArguments(event)),
      baseRate: 1,
      checkEvent: toolWorkMentions,
    },
    UserPromptSubmit: {
      baseRate: 0.01,
      checkEvent: lastTurnMentioned,
    },
  },
};

export function feedbackSampleRate(
  eventName,
  event,
  config = feedbackSampling,
) {
  const policy = Object.hasOwn(config.events, eventName)
    ? config.events[eventName]
    : undefined;
  if (!policy || (policy.eventConditions && !policy.eventConditions(event))) {
    return 0;
  }

  const context = {
    event,
    checkEvent: (pattern) => policy.checkEvent(pattern, event),
  };
  let rate = config.defaultRate;
  // Optional event rules run after shared rules, so they take precedence.
  for (const rule of [
    ...config.sampleRules,
    ...(policy.sampleRules ?? []),
  ]) {
    if (!rule.matches(context)) {
      continue;
    }
    const hasRate = Object.hasOwn(rule, 'rate');
    const hasMultiplier = Object.hasOwn(rule, 'multiplier');
    if (hasRate === hasMultiplier) {
      throw new Error('Sampling rules must specify either rate or multiplier');
    }
    const value = hasRate ? rule.rate : rule.multiplier;
    if (!Number.isFinite(value) || value < 0 || (hasRate && value > 1)) {
      throw new Error('Invalid feedback sampling rule');
    }
    rate = hasRate ? value : Math.min(1, policy.baseRate * value);
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error('Invalid feedback sampling rate');
  }
  return rate;
}

export function shouldSampleFeedback(eventName, event, random = Math.random) {
  const rate = feedbackSampleRate(eventName, event);
  return rate > 0 && sample(rate, random);
}

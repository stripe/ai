import assert from 'node:assert/strict';
import test from 'node:test';
import {
  feedbackSampling,
  feedbackSampleRate,
  shouldSampleFeedback,
} from '../../../../../providers/claude/plugin/scripts/feedbackSampling.mjs';

function agentEvent(prompt, content = '') {
  return {
    tool_name: 'Agent',
    tool_input: { prompt },
    tool_response: {
      status: 'completed',
      content: [{ type: 'text', text: content }],
    },
  };
}

function configWithRules(sampleRules, eventOverrides = {}) {
  return {
    ...feedbackSampling,
    sampleRules,
    events: {
      ...feedbackSampling.events,
      PostToolUse: {
        ...feedbackSampling.events.PostToolUse,
        ...eventOverrides,
      },
    },
  };
}

test('shared product multipliers apply to each event base rate', () => {
  for (const [term, multiplier] of [
    ['Stripe', 1],
    ['Metronome', 10],
  ]) {
    assert.equal(
      feedbackSampleRate('PostToolUse', agentEvent(term)),
      0.001 * multiplier,
    );
    assert.equal(
      feedbackSampleRate('UserPromptSubmit', { last_assistant_message: term }),
      0.01 * multiplier,
    );
    const call = {
      tool_name: 'mcp__stripe__search_stripe_documentation',
      tool_input: { query: term },
      tool_response: 'Results',
    };
    assert.equal(
      feedbackSampleRate('PostToolBatch', { tool_calls: [call] }),
      0.001 * multiplier,
    );
    assert.equal(feedbackSampleRate('PostToolUseFailure', call), 1);
  }
});

test('the last matching product wins even when both terms appear', () => {
  const event = agentEvent('Stripe and Metronome');
  assert.equal(feedbackSampleRate('PostToolUse', event), 0.01);
  assert.equal(
    feedbackSampleRate(
      'PostToolUse',
      event,
      configWithRules([...feedbackSampling.sampleRules].reverse()),
    ),
    0.001,
  );
});

test('multipliers replace the rate rather than multiplying previous matches', () => {
  const config = configWithRules([
    { matches: () => true, multiplier: 2 },
    { matches: () => true, multiplier: 3 },
  ]);
  assert.equal(
    feedbackSampleRate('PostToolUse', agentEvent('Stripe'), config),
    0.003,
  );
});

test('exact rates override multipliers and support testing a new phrase', () => {
  const config = configWithRules([
    ...feedbackSampling.sampleRules,
    { matches: ({ checkEvent }) => checkEvent(/test feedback/i), rate: 1 },
  ]);
  for (const prompt of ['Stripe Metronome test feedback', 'test feedback']) {
    assert.equal(
      feedbackSampleRate('PostToolUse', agentEvent(prompt), config),
      1,
    );
  }
  assert.equal(feedbackSampleRate('PostToolUse', agentEvent('CSS'), config), 0);
});

test('a later multiplier can override an exact rate', () => {
  const config = configWithRules([
    { matches: () => true, rate: 1 },
    { matches: () => true, multiplier: 10 },
  ]);
  assert.equal(
    feedbackSampleRate('PostToolUse', agentEvent('Stripe'), config),
    0.01,
  );
});

test('event-specific rules run after shared rules and can disable sampling', () => {
  const config = configWithRules(feedbackSampling.sampleRules, {
    sampleRules: [
      { matches: ({ checkEvent }) => checkEvent(/metronome/i), rate: 0.25 },
      {
        matches: ({ event }) => event.tool_input.prompt.includes('skip'),
        rate: 0,
      },
    ],
  });
  assert.equal(
    feedbackSampleRate('PostToolUse', agentEvent('Metronome'), config),
    0.25,
  );
  assert.equal(
    feedbackSampleRate('PostToolUse', agentEvent('Metronome skip'), config),
    0,
  );
  assert.equal(
    feedbackSampleRate('PostToolUse', agentEvent('Stripe'), config),
    0.001,
  );
  assert.equal(
    feedbackSampleRate(
      'UserPromptSubmit',
      { last_assistant_message: 'Metronome' },
      config,
    ),
    0.1,
  );
});

test('eligibility gates and unknown events bypass all rules', () => {
  const config = configWithRules([
    {
      matches: () => assert.fail('Ineligible events must not evaluate rules'),
      rate: 1,
    },
  ]);
  for (const [name, event] of [
    ['PostToolUse', {
      ...agentEvent('Stripe'),
      tool_response: { status: 'async_launched' },
    }],
    ['PostToolUse', {
      tool_name: 'Skill',
      tool_input: { skill: 'stripe:metronome' },
    }],
    ['PostToolBatch', {
      tool_calls: [{ tool_name: 'Read', tool_response: 'Stripe' }],
    }],
    ['PostToolBatch', {
      tool_calls: [{
        tool_name: 'mcp__stripe__search',
        tool_response: 'MCP error: failed',
      }],
    }],
    ['PostToolUseFailure', { tool_name: 'Read', error: 'Stripe failed' }],
    ['SessionStart', {}],
    ['toString', {}],
  ]) {
    assert.equal(feedbackSampleRate(name, event, config), 0);
  }
});

test('unmatched eligible events use the configured default rate', () => {
  const event = agentEvent('CSS');
  assert.equal(feedbackSampleRate('PostToolUse', event), 0);
  assert.equal(
    feedbackSampleRate('PostToolUse', event, {
      ...feedbackSampling,
      defaultRate: 0.2,
    }),
    0.2,
  );
});

test('evidence matching includes agent results but excludes unrelated fields', () => {
  assert.equal(
    feedbackSampleRate('PostToolUse', agentEvent('Investigate', 'METRONOME')),
    0.01,
  );
  assert.equal(
    feedbackSampleRate('PostToolUse', { ...agentEvent('CSS'), description: 'Stripe' }),
    0,
  );
  assert.equal(
    feedbackSampleRate('UserPromptSubmit', {
      prompt: 'Stripe',
      last_assistant_message: 'CSS',
    }),
    0,
  );
});

test('tool identity and skill names qualify without literal mentions in results', () => {
  for (const call of [
    {
      tool_name: 'mcp__stripe__search',
      tool_input: {},
      tool_response: 'Results',
    },
    {
      tool_name: 'mcp__plugin_stripe_stripe__search',
      tool_input: {},
      tool_response: 'Results',
    },
    { tool_name: 'Skill', tool_input: { skill: 'stripe:stripe-docs' } },
    { tool_name: 'Skill', tool_input: { skill: 'stripe:metronome' } },
    { tool_name: 'Skill', tool_input: { skill: 'metronome-rate-cards' } },
  ]) {
    assert.equal(feedbackSampleRate('PostToolUseFailure', call), 1);
    assert.equal(
      feedbackSampleRate('PostToolBatch', { tool_calls: [call] }),
      /metronome/.test(call.tool_input.skill) ? 0.01 : 0.001,
    );
  }
});

test('stateful regexes are reset across evidence fields and evaluations', () => {
  const pattern = /stripe/gi;
  const config = configWithRules([
    { matches: ({ checkEvent }) => checkEvent(pattern), multiplier: 1 },
  ]);
  pattern.lastIndex = 100;
  for (let index = 0; index < 3; index += 1) {
    assert.equal(
      feedbackSampleRate('PostToolUse', agentEvent('CSS', 'Stripe'), config),
      0.001,
    );
  }
});

test('multipliers are capped at one', () => {
  const config = configWithRules([{ matches: () => true, multiplier: 2000 }]);
  assert.equal(feedbackSampleRate('PostToolUse', agentEvent('Stripe'), config), 1);
});

test('invalid matching rules cannot silently enable sampling', () => {
  for (const values of [
    {},
    { rate: 1, multiplier: 2 },
    { rate: -1 },
    { rate: 2 },
    { rate: NaN },
    { multiplier: -1 },
    { multiplier: Infinity },
  ]) {
    const config = configWithRules([{ matches: () => true, ...values }]);
    assert.throws(() =>
      feedbackSampleRate('PostToolUse', agentEvent('Stripe'), config),
    );
  }
});

test('sampling draws once at the final rate and never draws for excluded work', () => {
  let draws = 0;
  const random = () => {
    draws += 1;
    return 0.005;
  };
  assert.equal(
    shouldSampleFeedback('PostToolUse', agentEvent('Stripe Metronome'), random),
    true,
  );
  assert.equal(draws, 1);
  assert.equal(
    shouldSampleFeedback('PostToolUse', agentEvent('Stripe'), random),
    false,
  );
  assert.equal(draws, 2);
  assert.equal(
    shouldSampleFeedback('PostToolUse', agentEvent('CSS'), random),
    false,
  );
  assert.equal(shouldSampleFeedback('SessionStart', {}, random), false);
  assert.equal(draws, 2);
  assert.equal(
    shouldSampleFeedback('PostToolUse', agentEvent('Metronome'), () => 0.01),
    false,
  );
});

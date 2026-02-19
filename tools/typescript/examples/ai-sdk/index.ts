import {StripeAgentToolkit} from '@stripe/agent-toolkit/ai-sdk';
import {openai} from '@ai-sdk/openai';
import {generateText, stepCountIs} from 'ai';

require('dotenv').config();

const stripeAgentToolkit = new StripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: {},
});

(async () => {
  const result = await generateText({
    model: openai('gpt-4o'),

    tools: {
      ...stripeAgentToolkit.getTools(),
    },

    stopWhen: stepCountIs(5),

    prompt:
      'Create a payment link for a new product called "test" with a price of $100. Come up with a funny description about buy bots, maybe a haiku.',
  });

  console.log(result);
})();

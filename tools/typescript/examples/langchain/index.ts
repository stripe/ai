import {StripeAgentToolkit} from '@stripe/agent-toolkit/langchain';
import {ChatOpenAI} from '@langchain/openai';
import type {ChatPromptTemplate} from '@langchain/core/prompts';
import {pull} from 'langchain/hub';
import {AgentExecutor, createStructuredChatAgent} from 'langchain/agents';

require('dotenv').config();

const llm = new ChatOpenAI({
  model: 'gpt-4o',
});

const stripeAgentToolkit = new StripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: {},
});

(async (): Promise<void> => {
  const prompt = await pull<ChatPromptTemplate>(
    'hwchase17/structured-chat-agent'
  );

  const tools = stripeAgentToolkit.getTools();

  const agent = await createStructuredChatAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  const response = await agentExecutor.invoke({
    input: `
      Create a payment link for a new product called 'test' with a price
      of $100. Come up with a funny description about buy bots,
      maybe a haiku.
    `,
  });

  console.log(response);
})();

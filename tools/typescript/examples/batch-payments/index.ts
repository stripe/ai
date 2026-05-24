import {createStripeAgentToolkit} from '@stripe/agent-toolkit/openai';
import OpenAI from 'openai';
import type {ChatCompletionMessageParam} from 'openai/resources';

require('dotenv').config();

const openai = new OpenAI();

/**
 * Example: Extending the Stripe Agent Toolkit with batch payment tools
 * via an additional MCP server.
 *
 * This example uses Spraay Protocol (https://spraay.app) — an x402 batch
 * payment gateway supporting 13 chains, payroll, invoicing, and multi-
 * recipient transfers in a single on-chain transaction.
 *
 * Spraay's x402 gateway:  https://gateway.spraay.app
 * MCP server (Smithery):  https://smithery.ai/server/@plagtech/spraay-x402-mcp
 * npm:                    @plagtech/spraay-x402-mcp
 *
 * Use cases:
 * - Payroll: "Pay all 5 contractors from this invoice batch"
 * - Multi-vendor: "Transfer USDC to these 3 suppliers"
 * - Revenue sharing: "Split this payment across 4 recipients"
 */
async function main(): Promise<void> {
  if (!process.env.SPRAAY_MCP_URL) {
    console.error(
      'Set SPRAAY_MCP_URL to your Spraay MCP server endpoint.\n' +
        'See: https://smithery.ai/server/@plagtech/spraay-x402-mcp'
    );
    process.exit(1);
  }

  const toolkit = await createStripeAgentToolkit({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    configuration: {
      additionalMcpServers: [
        {
          name: 'Spraay Protocol',
          url: process.env.SPRAAY_MCP_URL,
          headers: {
            ...(process.env.SPRAAY_API_KEY && {
              'X-API-KEY': process.env.SPRAAY_API_KEY,
            }),
          },
        },
      ],
    },
  });

  // The toolkit now includes both Stripe's core tools (create_payment_link,
  // create_invoice, etc.) AND Spraay's batch payment tools
  // (batch_execute, payroll_execute, invoice_create, etc.)
  const tools = toolkit.getTools();

  console.log(
    `Loaded ${tools.length} tools (Stripe core + batch payments)\n`
  );

  let messages: ChatCompletionMessageParam[] = [
    {
      role: 'user',
      content: `I need to pay three contractors for this month's work:
        - Alice (0x1234...abcd): $500 USDC
        - Bob (0x5678...efgh): $750 USDC
        - Carol (0x9abc...ijkl): $300 USDC

        Use a batch transfer on Base to pay them all in one transaction.`,
    },
  ];

  while (true) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
    });

    const message = completion.choices[0].message;
    messages.push(message);

    if (message.tool_calls) {
      const toolMessages = await Promise.all(
        message.tool_calls.map((tc) => toolkit.handleToolCall(tc))
      );
      messages = [...messages, ...toolMessages];
    } else {
      console.log('Agent response:', message.content);
      break;
    }
  }

  await toolkit.close();
}

main().catch(console.error);
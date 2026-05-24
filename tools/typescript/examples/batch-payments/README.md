# Batch Payments Example

Extends the Stripe Agent Toolkit with batch payment tools from [Spraay Protocol](https://spraay.app) — an x402 batch payment gateway supporting 13 chains.

## What this enables

- **Payroll**: Pay multiple contractors in one transaction
- **Revenue sharing**: Split payments across multiple recipients
- **Multi-vendor payments**: Transfer funds to multiple suppliers
- **Batch invoicing**: Generate invoices for multiple recipients

## Spraay Protocol

| Resource | URL |
|---|---|
| x402 Gateway (live) | https://gateway.spraay.app |
| MCP Server (120 tools) | https://smithery.ai/server/@plagtech/spraay-x402-mcp |
| npm | [@plagtech/spraay-x402-mcp](https://www.npmjs.com/package/@plagtech/spraay-x402-mcp) |
| Documentation | https://docs.spraay.app |

## Setup

npm install

Copy `.env.template` to `.env` and fill in:

STRIPE_SECRET_KEY=rk_test_...
OPENAI_API_KEY=sk-...
SPRAAY_MCP_URL=         # Your Spraay MCP server endpoint
SPRAAY_API_KEY=         # Optional API key

## Run

npx ts-node index.ts

## How it works

Additional MCP servers are configured via the `additionalMcpServers` option:

const toolkit = await createStripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: {
    additionalMcpServers: [
      {
        name: 'Spraay Protocol',
        url: process.env.SPRAAY_MCP_URL,
      },
    ],
  },
});

Tools from both Stripe and additional servers are merged into a single list. When the agent calls a tool, the toolkit automatically routes to the correct server.

This pattern works with any MCP-compatible server — Spraay is one example providing batch payment infrastructure that complements Stripe's core tools.
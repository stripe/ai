# feat: Add support for additional MCP servers with x402 batch payment example

## Problem

The Stripe Agent Toolkit currently connects exclusively to `mcp.stripe.com` for its tools. While the core Stripe tools handle individual operations well (create_payment_link, create_invoice, etc.), agents frequently need to perform **batch operations** — paying multiple contractors, splitting revenue across recipients, or processing bulk refunds.

Today, an agent handling "pay these 5 contractors" must loop through individual `create_transfer` calls. There's no batch primitive, and no way to extend the toolkit with additional payment capabilities from external providers.

## Solution

This PR adds support for **additional MCP servers** whose tools are merged with the core Stripe tools. This enables:

1. **Extensibility**: The toolkit can now surface tools from any MCP-compatible server alongside Stripe's core tools
2. **Automatic routing**: Tool calls are transparently routed to the correct server — agents don't need to know which server provides which tool
3. **Batch payments**: The included example demonstrates x402 batch payment tools via [Spraay Protocol](https://spraay.app), enabling multi-recipient on-chain transfers in a single transaction

### How it works

```typescript
const toolkit = await createStripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: {
    additionalMcpServers: [
      {
        name: 'Spraay Protocol',
        url: 'https://mcp.spraay.app',
      },
    ],
  },
});

// Tools from both Stripe and additional servers are available
const tools = toolkit.getTools();
```

When the agent calls a tool:
- If the tool came from an additional server → routed to that server
- Otherwise → routed to `mcp.stripe.com` as before

### Why x402

Stripe already supports the x402 payment protocol on Base. This PR extends that support into the agent toolkit by enabling x402-based batch payments — settling multiple transfers in a single on-chain transaction via USDC.

## Changes

### Core changes (backward compatible)

- **`configuration.ts`**: Added `AdditionalMcpServer` type and `additionalMcpServers` config option
- **`multi-mcp-client.ts`**: New client that manages connections to additional MCP servers with tool routing
- **`toolkit-core.ts`**: Extended `initialize()` to connect additional servers; added `routeToolCall()` for transparent routing

### Framework updates

- **`openai/toolkit.ts`**: Updated `handleToolCall()` to use `routeToolCall()` for correct routing
- **`langchain/toolkit.ts`**: Updated `StripeTool` to route through `ToolkitCore` instead of direct `mcpClient` access  
- **`ai-sdk/toolkit.ts`**: Updated `execute` callbacks to use `routeToolCall()`

### Example & tests

- **`examples/batch-payments/`**: Complete example showing x402 batch payments with Spraay Protocol
- **`test/shared/multi-mcp-client.test.ts`**: Unit tests for the multi-MCP client

## Backward compatibility

- **Zero breaking changes**: The `additionalMcpServers` config is optional and defaults to `undefined`
- **Existing behavior preserved**: Without additional servers, the toolkit behaves identically to before
- **All existing tests pass**: Core MCP client behavior is unchanged

## Testing

```bash
cd tools/typescript
pnpm test
```

# Migration Guide: API to MCP Architecture

This guide covers migrating from the direct API-based toolkit (v0.8.x) to the MCP-based architecture (v0.9.0+).

## Breaking Changes

### 1. Async Initialization Required

Toolkit initialization now connects to `mcp.stripe.com` and must be awaited.

```typescript
// Before (v0.8.x)
const toolkit = new StripeAgentToolkit({secretKey, configuration});
const tools = toolkit.getTools();

// After (v0.9.0+)
const toolkit = await createStripeAgentToolkit({secretKey, configuration});
const tools = toolkit.getTools();
await toolkit.close(); // Clean up when done
```

**Impact:** Synchronous usage will throw: `"StripeAgentToolkit not initialized. Call await toolkit.initialize() first."`

### 2. MCP Connection Required

Tools are fetched from `mcp.stripe.com`. If the server is unreachable, initialization fails with no fallback.

**Impact:** Ensure network access to `mcp.stripe.com` (HTTPS port 443) in all environments.

### 3. Tool Names Changed to snake_case

| Old                 | New                   |
| ------------------- | --------------------- |
| `createCustomer`    | `create_customer`     |
| `listCustomers`     | `list_customers`      |
| `createPaymentLink` | `create_payment_link` |

**Impact:** Update any custom tool filtering logic to use snake_case.

### 4. `@modelcontextprotocol/sdk` Now a Direct Dependency

The MCP SDK moved from a peer dependency to a direct dependency. You can no longer override the version—the toolkit bundles a specific version.

### 5. `actions` Configuration Removed

The `configuration.actions` option has been removed. Tool permissions are now controlled entirely by your Restricted API Key (RAK) on the server side.

```typescript
// Before (v0.8.x)
const toolkit = new StripeAgentToolkit({
  secretKey: 'rk_test_...',
  configuration: {
    actions: {
      customers: {create: true, read: true},
      invoices: {create: true},
    },
  },
});

// After (v0.9.0+)
const toolkit = await createStripeAgentToolkit({
  secretKey: 'rk_test_...', // RAK permissions control which tools are available
  configuration: {
    context: {account: 'acct_123'}, // Only context options remain
  },
});
```

**Impact:** Remove any `actions` from your configuration. Configure permissions when creating your Restricted API Key in the Stripe Dashboard instead.

### 6. Metered Billing Middleware Removed

The `middleware()` method for AI SDK metered billing has been removed. If you were using token-based billing:

```typescript
// Before (v0.8.x) - No longer available
const model = wrapLanguageModel({
  model: openai('gpt-4o'),
  middleware: stripeAgentToolkit.middleware({
    billing: {
      customer: 'cus_123',
      meters: {
        input: 'input_tokens',
        output: 'output_tokens',
      },
    },
  }),
});
```

**Impact:** Implement metered billing separately using the Stripe SDK directly. To learn more, checkout the Stripe Docs on [Token Billing](https://docs.stripe.com/billing/token-billing).

---

## New API

There are two ways to initialize the toolkit. Both are valid—choose whichever fits your code structure better.

### Option 1: Factory Function (Recommended)

The simplest approach. Creates and initializes the toolkit in one step:

```typescript
import {createStripeAgentToolkit} from '@stripe/agent-toolkit/openai';
// Also available: /ai-sdk, /langchain, /modelcontextprotocol

const toolkit = await createStripeAgentToolkit({
  secretKey: 'rk_test_...',
  configuration: {},
});

const tools = toolkit.getTools();
// ... use tools ...

await toolkit.close(); // Clean up when done
```

### Option 2: Constructor + initialize()

If you need to create the toolkit instance separately from initialization (e.g., for dependency injection or delayed initialization):

```typescript
import StripeAgentToolkit from '@stripe/agent-toolkit/openai';

const toolkit = new StripeAgentToolkit({
  secretKey: 'rk_test_...',
  configuration: {},
});

// Later, when ready to use:
await toolkit.initialize();

const tools = toolkit.getTools();
// ... use tools ...

await toolkit.close(); // Clean up when done
```

### Cleanup

Always close the MCP connection when done:

```typescript
await toolkit.close();
```

---

## Other Changes

### Restricted Keys Recommended

We strongly recommend using restricted keys (`rk_*`) instead of `sk_*` keys for better security and granular permissions. Tool availability is determined by your RAK's permissions on the server.

### Schema Conversion Limitations

The toolkit converts JSON Schema to Zod for validation. Some schema features are not supported:

- **Not Supported:** `oneOf`, `anyOf`, `allOf`, `$ref`, conditional schemas
- **Supported:** Primitives, arrays, simple objects, enums, required/optional fields

---

## Deployment Considerations

### Edge Runtimes

Edge environments (Cloudflare Workers, Vercel Edge) may have limited support:

- MCP uses HTTP streaming which some runtimes don't fully support
- Long-lived connections may be terminated
- Cold starts add connection overhead

**Workaround:** Use traditional Node.js serverless functions for agent operations.

---

## Migration Checklist

- [ ] Use `createStripeAgentToolkit()` factory function with `await`
- [ ] Add error handling for MCP connection failures
- [ ] Ensure `mcp.stripe.com` is accessible in all environments
- [ ] Update tool name filters to snake_case
- [ ] Add `toolkit.close()` for cleanup
- [ ] Remove `configuration.actions` and configure permissions via Restricted API Key instead
- [ ] Switch to restricted keys (`rk_*`) for production use

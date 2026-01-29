# Migration Guide: API to MCP Architecture

This guide covers migrating from the direct API-based toolkit (v0.8.x) to the MCP-based architecture (v0.9.0+).

## Breaking Changes

### 1. Async Initialization Required

Toolkit initialization now connects to `mcp.stripe.com` and must be awaited.

```typescript
// Before (v0.8.x)
const toolkit = new StripeAgentToolkit({ secretKey, configuration });
const tools = toolkit.getTools();

// After (v0.9.0+)
const toolkit = await createStripeAgentToolkit({ secretKey, configuration });
const tools = toolkit.getTools();
await toolkit.close(); // Clean up when done
```

**Impact:** Synchronous usage will throw: `"StripeAgentToolkit not initialized. Call await toolkit.initialize() first."`

### 2. MCP Connection Required

Tools are fetched from `mcp.stripe.com`. If the server is unreachable, initialization fails with no fallback.

**Impact:** Ensure network access to `mcp.stripe.com` (HTTPS port 443) in all environments.

### 3. Tool Names Changed to snake_case

| Old | New |
|-----|-----|
| `createCustomer` | `create_customer` |
| `listCustomers` | `list_customers` |
| `createPaymentLink` | `create_payment_link` |

**Impact:** Update any custom tool filtering logic to use snake_case.

### 4. `@modelcontextprotocol/sdk` Now a Direct Dependency

The MCP SDK moved from a peer dependency to a direct dependency. You can no longer override the version—the toolkit bundles a specific version.

---

## New API

### Factory Function (Recommended)

All frameworks export `createStripeAgentToolkit()`:

```typescript
import { createStripeAgentToolkit } from '@stripe/agent-toolkit/ai-sdk';
// Also: /langchain, /openai, /modelcontextprotocol

const toolkit = await createStripeAgentToolkit({
  secretKey: 'rk_test_...',
  configuration: { actions: { customers: { create: true } } },
  timeout: 30000, // Optional: connection timeout in ms
});
```

### Cleanup

Close the MCP connection when done:

```typescript
await toolkit.close();
```

### Timeout Configuration

By default, there is no timeout. Set one to fail fast on slow networks:

```typescript
const toolkit = await createStripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: { /* ... */ },
  timeout: 60000, // 60 seconds
});
```

---

## Other Changes

### Restricted Keys Recommended

`sk_*` keys trigger a deprecation warning. Use restricted keys (`rk_*`) for better security.

### Unknown Tools Allowed by Default

New tools from `mcp.stripe.com` bypass client-side permission filtering until the permission map is updated. The server-side permissions (via restricted API keys) are the primary security boundary.

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
- [ ] Consider switching to restricted keys (`rk_*`)

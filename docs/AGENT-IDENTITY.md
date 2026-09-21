# Agent Identity and Per-Tool Authorization

The README covers how Restricted API Keys (RAKs) control which Stripe API
resources a key can access. This guide covers a different question: when
multiple agents or third-party tools connect to the Stripe MCP server, how
do you verify which agent is acting and restrict what tools it can call?

## When this matters

- Multiple agents share the same Stripe API key
- A third-party agent framework or wrapper connects to your MCP server
- You want to attribute charges and refunds to specific agent software for operational visibility
- You want to restrict some agents to read-only access while others can create payments

## Pattern: authorization proxy

Place a reverse proxy between agents and the Stripe MCP server. The proxy
verifies agent credentials and enforces a per-tool permission policy before
forwarding requests. The MCP server does not need code changes.

```
Agent → Authorization Proxy (verify + enforce) → Stripe MCP Server
```

The proxy should:
1. Verify the agent's identity (signed attestation, API key, certificate, etc.)
2. Check the requested tool against a permission policy
3. Reject unauthorized or replayed requests
4. Log the decision for troubleshooting and accountability

## Example tool permission tiers

Stripe MCP tools have different risk levels. As an illustrative starting
point, you might group them like this:

| Tier | Example tools | Rationale |
|------|--------------|-----------|
| Read-only | `list_customers`, `get_balance`, `list_invoices`, `list_subscriptions`, `search_documentation` | No side effects |
| Write | `create_customer`, `update_subscription`, `create_product`, `create_price`, `create_coupon` | Modifies state but does not create financial exposure |
| Financial (creates exposure) | `create_payment_intent`, `create_invoice`, `create_payment_link` | Creates charges or payment obligations |
| Financial (destructive) | `create_refund`, `void_invoice` | Reverses or cancels financial transactions |

> **This is illustrative, not exhaustive.** See the
> [Stripe MCP documentation](https://docs.stripe.com/mcp#tools) for the
> current tool list and review each tool's risk level before building
> your policy. Tools may be added or renamed between versions.

An agent authorized for "Read-only" should not be able to call
`create_payment_intent`. The proxy enforces this before the request reaches
the MCP server.

### RAKs and tool tiers are complementary

RAKs control which Stripe API resources a key can access. Tool tiers control
which agent can call which tool through the proxy. Use both:

- RAK: limits the blast radius of the API key itself
- Tool tiers: limits what each agent can do with that key

## Implementation options

Several approaches can implement this pattern:

- **API gateway with tool-name routing** (e.g., nginx + Lua, Envoy, Kong):
  inspect the JSON-RPC `params.name` field and enforce allow/deny rules
  per agent identity.
- **MCP-aware auth proxy** (e.g., [@bolyra/gateway](https://github.com/bolyra/bolyra/tree/main/integrations/gateway)):
  a reverse proxy purpose-built for MCP servers with per-tool policy
  enforcement and decision logging.
- **Policy-as-code proxy** (e.g., [Intercept](https://github.com/PolicyLayer/Intercept)):
  evaluates YAML policy files against every `tools/call` request. See
  [#293](https://github.com/stripe/ai/issues/293) for a Stripe-specific
  policy template.
- **Custom middleware**: wrap the MCP server's HTTP transport with
  authentication and authorization checks.

The choice depends on your deployment topology and trust model.

## What the proxy should log

For each `tools/call` request, the proxy should record:
- Agent identity (however you identify agents)
- Tool name requested
- Decision (allowed or denied)
- Timestamp
- Reason for denial (if applicable)

This creates a record that answers "which agent placed this charge?" —
useful for troubleshooting, incident response, and operational visibility.

## Relationship to existing security layers

| Layer | Protects | Documented in |
|-------|----------|---------------|
| Restricted API Keys | Which API resources the key can access | [Stripe docs](https://docs.stripe.com/keys#create-restricted-api-keys) |
| Security policy templates | Rate limits and argument constraints per tool | [#293](https://github.com/stripe/ai/issues/293) |
| Agent authorization | Which agent can call which tools | This guide |

All three layers are independent. You can use any combination depending on
your threat model.

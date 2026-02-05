# Migration Guide: API to MCP Architecture

This guide covers migrating from the direct API-based toolkit (v0.6.x) to the MCP-based architecture (v0.7.0+).

## Breaking Changes

### 1. Async Initialization Required

Toolkit initialization now connects to `mcp.stripe.com` and must be awaited.

```python
# Before (v0.6.x)
from stripe_agent_toolkit.openai.toolkit import StripeAgentToolkit

toolkit = StripeAgentToolkit(secret_key="sk_test_...", configuration={...})
tools = toolkit.tools

# After (v0.7.0+)
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit

toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")
tools = toolkit.get_tools()
await toolkit.close()  # Clean up when done
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

### 4. `mcp` Package Now Required

The `mcp` package is now a required dependency:

```bash
pip install stripe-agent-toolkit>=0.7.0
```

### 5. `actions` Configuration Removed

The `configuration.actions` option has been removed. Tool permissions are now controlled entirely by your Restricted API Key (RAK) on the server side.

```python
# Before (v0.6.x)
toolkit = StripeAgentToolkit(
    secret_key="rk_test_...",
    configuration={
        "actions": {
            "customers": {"create": True, "read": True},
            "invoices": {"create": True},
        },
    },
)

# After (v0.7.0+)
toolkit = await create_stripe_agent_toolkit(
    secret_key="rk_test_...",  # RAK permissions control which tools are available
    configuration={
        "context": {"account": "acct_123"},  # Only context options remain
    },
)
```

**Impact:** Remove any `actions` from your configuration. Configure permissions when creating your Restricted API Key in the Stripe Dashboard instead.

---

## New API

### Factory Function (Recommended)

All frameworks export `create_stripe_agent_toolkit()`:

```python
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit
# Also: .langchain.toolkit, .crewai.toolkit, .strands.toolkit

toolkit = await create_stripe_agent_toolkit(
    secret_key="rk_test_...",
)
```

### Cleanup

Close the MCP connection when done:

```python
await toolkit.close()
```

### Using try/finally for Cleanup

```python
async def main():
    toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")
    try:
        tools = toolkit.get_tools()
        # ... use tools ...
    finally:
        await toolkit.close()
```

---

## Framework-Specific Examples

### OpenAI Agents SDK

```python
import asyncio
from agents import Agent, Runner
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")

    try:
        agent = Agent(
            name="Stripe Agent",
            tools=toolkit.get_tools(),
        )
        result = await Runner.run(agent, "Create a customer with email test@example.com")
        print(result.final_output)
    finally:
        await toolkit.close()

asyncio.run(main())
```

### LangChain

```python
import asyncio
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from stripe_agent_toolkit.langchain.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")

    try:
        llm = ChatOpenAI(model="gpt-4o")
        agent = create_react_agent(llm, toolkit.get_tools())
        result = agent.invoke({"messages": "Create a payment link for $50"})
        print(result["messages"][-1].content)
    finally:
        await toolkit.close()

asyncio.run(main())
```

### CrewAI

```python
import asyncio
from crewai import Agent, Task, Crew
from stripe_agent_toolkit.crewai.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")

    try:
        agent = Agent(
            role="Stripe Agent",
            goal="Create Stripe products",
            tools=toolkit.get_tools(),
        )
        task = Task(description="Create a product", agent=agent)
        crew = Crew(agents=[agent], tasks=[task])
        crew.kickoff()
    finally:
        await toolkit.close()

asyncio.run(main())
```

### Strands

```python
import asyncio
from strands import Agent
from stripe_agent_toolkit.strands.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")

    try:
        agent = Agent(tools=toolkit.get_tools())
        response = agent("Create a payment link for $25")
        print(response)
    finally:
        await toolkit.close()

asyncio.run(main())
```

---

## Other Changes

### Restricted Keys Recommended

`sk_*` keys trigger a deprecation warning. Use restricted keys (`rk_*`) for better security. Tool availability is determined by your RAK's permissions on the server.

Create restricted keys at: https://dashboard.stripe.com/apikeys

---

## Migration Checklist

- [ ] Use `create_stripe_agent_toolkit()` factory function with `await`
- [ ] Add error handling for MCP connection failures
- [ ] Ensure `mcp.stripe.com` is accessible in all environments
- [ ] Update tool name filters to snake_case
- [ ] Add `await toolkit.close()` for cleanup (use try/finally)
- [ ] Remove `configuration.actions` and configure permissions via Restricted API Key instead
- [ ] Switch to restricted keys (`rk_*`) for production use

## Troubleshooting

### Connection Errors

If you see `Failed to connect to Stripe MCP server`:
1. Check network connectivity to `mcp.stripe.com`
2. Verify your API key is valid
3. Ensure firewall allows HTTPS (port 443) outbound

### "Not initialized" Errors

If you see `StripeAgentToolkit not initialized`:
- Make sure you're using `await create_stripe_agent_toolkit()`
- Or call `await toolkit.initialize()` after creating the toolkit

### Deprecation Warnings

If you see warnings about deprecated patterns:
- Switch from `StripeAgentToolkit()` to `create_stripe_agent_toolkit()`
- Switch from `sk_*` keys to `rk_*` restricted keys

## Getting Help

- GitHub Issues: https://github.com/stripe/agent-toolkit/issues
- Stripe Documentation: https://docs.stripe.com/agent-toolkit

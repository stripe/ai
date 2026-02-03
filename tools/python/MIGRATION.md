# Migration Guide: API to MCP Architecture (Python)

This guide helps you upgrade from `stripe-agent-toolkit` v0.6.x to v0.7.0+, which introduces the MCP (Model Context Protocol) architecture.

## Overview

Version 0.7.0 introduces a major architectural change: instead of calling the Stripe API directly, the toolkit now connects to `mcp.stripe.com` to fetch tools and execute operations. This provides:

- **Consistent tool definitions** across all SDKs (Python, TypeScript)
- **Automatic updates** when new Stripe API features are available
- **Improved security** with restricted key support

## Breaking Changes

### 1. Async Initialization Required

Toolkit initialization now connects to `mcp.stripe.com` and **must be awaited**.

**Before (v0.6.x):**
```python
from stripe_agent_toolkit.openai.toolkit import StripeAgentToolkit

toolkit = StripeAgentToolkit(
    secret_key=os.environ["STRIPE_SECRET_KEY"],
    configuration={"actions": {"customers": {"create": True}}}
)
tools = toolkit.get_tools()
```

**After (v0.7.0+):**
```python
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(
        secret_key=os.environ["STRIPE_SECRET_KEY"],
        configuration={"actions": {"customers": {"create": True}}}
    )
    tools = toolkit.get_tools()

    # ... use tools ...

    await toolkit.close()  # Clean up when done

asyncio.run(main())
```

### 2. Factory Functions

Each framework now provides a `create_stripe_agent_toolkit()` factory function:

| Framework | Import |
|-----------|--------|
| OpenAI | `from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit` |
| LangChain | `from stripe_agent_toolkit.langchain.toolkit import create_stripe_agent_toolkit` |
| CrewAI | `from stripe_agent_toolkit.crewai.toolkit import create_stripe_agent_toolkit` |
| Strands | `from stripe_agent_toolkit.strands.toolkit import create_stripe_agent_toolkit` |

### 3. Resource Cleanup

Always call `await toolkit.close()` when done to properly close the MCP connection:

```python
try:
    toolkit = await create_stripe_agent_toolkit(...)
    # ... use toolkit ...
finally:
    await toolkit.close()
```

### 4. MCP Connection Required

Tools are now fetched from `mcp.stripe.com`. Ensure your environment has:
- Network access to `mcp.stripe.com` on HTTPS port 443
- A valid Stripe API key (restricted keys `rk_*` recommended)

### 5. Deprecated Direct Class Instantiation

While `StripeAgentToolkit(...)` still works, it will emit a deprecation warning if you access tools before calling `initialize()`:

```python
# Deprecated pattern (still works but shows warning)
toolkit = StripeAgentToolkit(secret_key=key)
await toolkit.initialize()  # Must call this!
tools = toolkit.get_tools()

# Recommended pattern
toolkit = await create_stripe_agent_toolkit(secret_key=key)
tools = toolkit.get_tools()
```

## Framework-Specific Examples

### OpenAI Agents SDK

```python
import asyncio
from agents import Agent, Runner
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(
        secret_key="rk_test_...",
        configuration={
            "actions": {
                "customers": {"create": True},
                "products": {"create": True},
            }
        },
    )

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
    toolkit = await create_stripe_agent_toolkit(
        secret_key="rk_test_...",
        configuration={
            "actions": {
                "payment_links": {"create": True},
            }
        },
    )

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
    toolkit = await create_stripe_agent_toolkit(
        secret_key="rk_test_...",
        configuration={
            "actions": {
                "products": {"create": True},
            }
        },
    )

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
    toolkit = await create_stripe_agent_toolkit(
        secret_key="rk_test_...",
        configuration={
            "actions": {
                "payment_links": {"create": True},
            }
        },
    )

    try:
        agent = Agent(tools=toolkit.get_tools())
        response = agent("Create a payment link for $25")
        print(response)
    finally:
        await toolkit.close()

asyncio.run(main())
```

## New Dependencies

The `mcp` package is now required:

```bash
pip install stripe-agent-toolkit>=0.7.0
# or with extras
pip install stripe-agent-toolkit[openai]>=0.7.0
```

## API Key Recommendations

We recommend using **restricted keys** (`rk_*`) instead of secret keys (`sk_*`):

- Restricted keys provide better security by limiting API access
- Secret keys will show a deprecation warning
- Create restricted keys at: https://dashboard.stripe.com/apikeys

```python
# Recommended
toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")

# Deprecated (shows warning)
toolkit = await create_stripe_agent_toolkit(secret_key="sk_test_...")
```

## Migration Checklist

- [ ] Update import to use `create_stripe_agent_toolkit` factory function
- [ ] Wrap toolkit initialization in `async` function with `await`
- [ ] Add `await toolkit.close()` for cleanup (use try/finally)
- [ ] Ensure `mcp.stripe.com` is accessible from your environment
- [ ] Consider switching to restricted keys (`rk_*`) for better security
- [ ] Update any tests that mock toolkit initialization

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

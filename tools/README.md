# Tools

## Model Context Protocol

Stripe hosts a remote MCP server at `https://mcp.stripe.com`. This allows secure MCP client access via OAuth. View the docs [here](https://docs.stripe.com/mcp#remote).

It can also be used to create autonomous agents.

For a local MCP, see the [MCP](/modelcontextprotocol) package.

## Agent Toolkit

The Stripe Agent Toolkit enables popular agent frameworks including Model Context Protocol (MCP), OpenAI's Agent SDK, LangChain, CrewAI, and Vercel's AI SDK to integrate with Stripe APIs through function calling. The
library is not exhaustive of the entire Stripe API. It includes support for MCP, Python, and TypeScript and is built directly on top of the Stripe [Python][python-sdk] and [Node][node-sdk] SDKs.

Included below are basic instructions, but refer to [Python](/tools/python), [TypeScript](/tools/typescript) packages for more information.

## Model Context Protocol

The Stripe Agent Toolkit also exposes tools in the [Model Context Protocol (MCP)](https://modelcontextprotocol.com/) format. Or, to run a local Stripe MCP server using npx, use the following command:

```bash
npx -y @stripe/mcp --api-key=YOUR_STRIPE_SECRET_KEY
```

Tool permissions are controlled by your Restricted API Key (RAK). Create a RAK with the desired permissions at https://dashboard.stripe.com/apikeys

## Python

### Installation

You don't need this source code unless you want to modify the package. If you just
want to use the package run:

```sh
pip install stripe-agent-toolkit
```

#### Requirements

- Python 3.11+

### Usage

The library needs to be configured with your account's secret key which is
available in your [Stripe Dashboard][api-keys]. We strongly recommend using a [Restricted API Key][restricted-keys] (`rk_*`)—secret keys (`sk_*`) will show deprecation warnings and will be phased out in future versions. Tool availability is determined by the permissions you configure on the restricted key.

```python
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")
    tools = toolkit.get_tools()
    # ... use tools ...
    await toolkit.close()  # Clean up when done
```

The toolkit works with OpenAI's Agent SDK, LangChain, and CrewAI and can be passed as a list of tools. For example:

```python
from agents import Agent

async def main():
    toolkit = await create_stripe_agent_toolkit(secret_key="rk_test_...")

    stripe_agent = Agent(
        name="Stripe Agent",
        instructions="You are an expert at integrating with Stripe",
        tools=toolkit.get_tools()
    )
    # ... use agent ...
    await toolkit.close()
```

Examples for OpenAI's Agent SDK,LangChain, and CrewAI are included in [/examples](/tools/python/examples).

#### Context

In some cases you will want to provide values that serve as defaults when making requests. Currently, the `account` context value enables you to make API calls for your [connected accounts](https://docs.stripe.com/connect/authentication).

```python
toolkit = await create_stripe_agent_toolkit(
    secret_key="rk_test_...",
    configuration={
        "context": {
            "account": "acct_123"
        }
    }
)
```

## TypeScript

### Installation

You don't need this source code unless you want to modify the package. If you just
want to use the package run:

```
npm install @stripe/agent-toolkit
```

#### Requirements

- Node 18+

### Usage

The library needs to be configured with your account's secret key which is available in your [Stripe Dashboard][api-keys]. We strongly recommend using a [Restricted API Key][restricted-keys] (`rk_*`)—secret keys (`sk_*`) will show deprecation warnings and will be phased out in future versions. Tool availability is determined by the permissions you configure on the restricted key.

```typescript
import { createStripeAgentToolkit } from "@stripe/agent-toolkit/langchain";

const toolkit = await createStripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: {},
});

const tools = toolkit.getTools();
// ... use tools ...

await toolkit.close(); // Clean up when done
```

#### Tools

The toolkit works with LangChain and Vercel's AI SDK and can be passed as a list of tools. For example:

```typescript
import { AgentExecutor, createStructuredChatAgent } from "langchain/agents";
import { createStripeAgentToolkit } from "@stripe/agent-toolkit/langchain";

const toolkit = await createStripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: {},
});

const tools = toolkit.getTools();

const agent = await createStructuredChatAgent({
  llm,
  tools,
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
});
```

#### Context

In some cases you will want to provide values that serve as defaults when making requests. Currently, the `account` context value enables you to make API calls for your [connected accounts](https://docs.stripe.com/connect/authentication).

```typescript
const toolkit = await createStripeAgentToolkit({
  secretKey: process.env.STRIPE_SECRET_KEY!,
  configuration: {
    context: {
      account: "acct_123",
    },
  },
});
```

## Supported API methods

See the [Stripe MCP](https://docs.stripe.com/mcp) docs for a list of supported methods.

[python-sdk]: https://github.com/stripe/stripe-python
[node-sdk]: https://github.com/stripe/stripe-node
[api-keys]: https://dashboard.stripe.com/account/apikeys
[restricted-keys]: https://docs.stripe.com/keys#create-restricted-api-keys

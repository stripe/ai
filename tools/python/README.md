# Stripe Agent Toolkit - Python

The Stripe Agent Toolkit library enables popular agent frameworks including OpenAI's Agent SDK, LangChain, and CrewAI to integrate with Stripe APIs through function calling. The
library is not exhaustive of the entire Stripe API. It is built directly on top
of the [Stripe Python SDK][python-sdk].

## Installation

You don't need this source code unless you want to modify the package. If you just
want to use the package, just run:

```sh
uv pip install stripe-agent-toolkit
```

### Requirements

-   Python 3.11+

## Usage

The library needs to be configured with your account's secret key which is
available in your [Stripe Dashboard][api-keys]. We strongly recommend using a [Restricted API Key][restricted-keys] (`rk_*`) for better security and granular permissions. Tool availability is determined by the permissions you configure on the restricted key.

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

Examples for OpenAI's Agent SDK, LangChain, and CrewAI are included in [/examples](/examples).

[python-sdk]: https://github.com/stripe/stripe-python
[api-keys]: https://dashboard.stripe.com/account/apikeys
[restricted-keys]: https://docs.stripe.com/keys#create-restricted-api-keys

### Context

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

## Development

```
uv venv --python 3.11
source .venv/bin/activate
uv pip install -r requirements.txt
```

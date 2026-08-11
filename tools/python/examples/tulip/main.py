"""Real, live admission-gate demo -- connects to the real Stripe MCP
server (mcp.stripe.com) with a real test-mode key, using this toolkit's
own, unmodified `openai.toolkit.StripeAgentToolkit`.

Requires a real Stripe test-mode secret key (`STRIPE_SECRET_KEY`, free
at dashboard.stripe.com) -- same requirement every other example in this
directory has, since even fetching the tool catalog needs a real,
authenticated MCP connection (see `tulip/governance.py`'s module
docstring for why this toolkit's catalog can't be enumerated statically).

    cp .env.template .env   # fill in a real Stripe test-mode key
    python main.py

Optionally also set `TULIP_ADVISORY_URL` to a reachable Clusiana (or any
OpenAI-chat-compatible) model endpoint to exercise the escalate-only
inference layer described in `tulip/governance.py`'s module docstring --
without it, this demo runs the rule-based `classify()` alone, which is
the default and requires no model dependency at all.

For a credential-free correctness check of the governance logic itself
(mocked MCP session, no network), see `../../tests/test_tulip_governance.py`.
"""

import asyncio
import json
import os

from agents.run_context import RunContextWrapper
from clusiana_advisory import make_clusiana_advisory
from dotenv import load_dotenv

from stripe_agent_toolkit.openai.toolkit import (
    StripeAgentToolkit as OpenAIStripeAgentToolkit,
)
from stripe_agent_toolkit.tulip.governance import GovernedToolkitMixin

load_dotenv()


class GovernedStripeAgentToolkit(
    GovernedToolkitMixin, OpenAIStripeAgentToolkit
):
    """The entire integration, for this one framework -- see
    `tulip/governance.py`'s module docstring for why the same mixin
    composes identically with the `langchain`, `crewai`, and `strands`
    toolkits too."""


async def _invoke(function_tool, args: dict) -> str:
    """Same call shape the OpenAI Agents SDK runner uses once an LLM
    decides to call this tool."""
    ctx = RunContextWrapper(context=None)
    return await function_tool.on_invoke_tool(ctx, json.dumps(args))


def _tool_by_name(tools, name: str):
    for tool in tools:
        if tool.name == name:
            return tool
    raise AssertionError(
        f"no tool named {name!r} in the real, live-fetched catalog"
    )


async def main() -> None:
    secret_key = os.environ.get("STRIPE_SECRET_KEY")
    if not secret_key:
        print(
            "No STRIPE_SECRET_KEY set -- copy .env.template to .env and fill it in."
        )
        return

    advisory = make_clusiana_advisory()
    print(
        "advisory inference layer: "
        + (
            f"ON ({os.environ.get('TULIP_ADVISORY_URL')})"
            if advisory
            else "off (set TULIP_ADVISORY_URL to enable -- optional, "
            "rule-based classify() alone is the default)"
        )
    )
    toolkit = GovernedStripeAgentToolkit(
        secret_key=secret_key, advisory=advisory
    )
    await toolkit.initialize()

    try:
        tools = toolkit.get_tools()
        real_names = sorted(t.name for t in tools)
        print(f"real, live-fetched catalog: {len(real_names)} tools")
        print(f"first few: {real_names[:8]}\n")

        # Find one obviously-low-risk read and one obviously-high-risk
        # financial action from whatever the real catalog actually
        # contains -- not assumed names, since the catalog is live.
        low_risk_candidates = [
            n for n in real_names if n.startswith(("list_", "get_"))
        ]
        high_risk_candidates = [
            n
            for n in real_names
            if any(m in n for m in ("capture", "charge", "refund", "cancel"))
        ]

        if low_risk_candidates:
            name = low_risk_candidates[0]
            print(f"[{name}] expected low-risk, should auto-allow")
            result = await _invoke(_tool_by_name(tools, name), {})
            print(f"  EXECUTED -> {result[:300]}\n")
        else:
            print(
                "(no obviously low-risk tool found in this catalog -- skipping that half of the demo)\n"
            )

        if high_risk_candidates:
            name = high_risk_candidates[0]
            print(f"[{name}] expected high-risk, should be held")
            try:
                result = await _invoke(_tool_by_name(tools, name), {})
                print(f"  ALLOWED (unexpected) -> {result[:300]}\n")
            except Exception as e:  # noqa: BLE001 -- reporting the real AdmissionError shape
                print(f"  {type(e).__name__}: {e}\n")
        else:
            print(
                "(no obviously high-risk tool found in this catalog -- skipping that half of the demo)\n"
            )

        trail = toolkit.audit_trail()
        print(
            f"audit trail: {len(trail.records())} decisions, chain intact: {trail.verify()}"
        )
    finally:
        await toolkit.close()


if __name__ == "__main__":
    asyncio.run(main())

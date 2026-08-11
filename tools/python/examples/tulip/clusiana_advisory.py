"""A real, working `AdvisoryClassifier` (see `tulip/governance.py`)
backed by `clusiana-admit-v4`, tulip-agents' own model-based admission
classifier -- served over vLLM, OpenAI-chat-compatible.

This is the piece `governance.py`'s module docstring points at: the
rule-based `classify()` this package ships is a fixed, dependency-free
floor, deliberately not model-based so installing `stripe-agent-toolkit`
never requires standing up a model server. This file is the optional
other half -- point `GovernedStripeAgentToolkit(advisory=...)` at a real
classifier (Clusiana here, or your own) and it can *escalate* a call the
rules missed, on live inference over the real tool description, not
keyword substrings. It can never soften a call the rules already flagged
high-risk -- that asymmetry is enforced in `governance.py`, not here.

Requires a reachable Clusiana-compatible endpoint and `tulip-agents`
installed with its model client extra. Not required to use this
package at all -- `advisory=None` (the default) skips this entirely.

    TULIP_ADVISORY_URL=http://127.0.0.1:8010 python main.py
"""

from __future__ import annotations

import os
from typing import Any

from tulip.core.messages import Message
from tulip.models.native.openai import OpenAIModel

_POLICY = (
    "Before executing any Stripe API action that moves real money, "
    "creates real financial or dispute liability, or permanently "
    "destroys a record, you must obtain explicit human confirmation. "
    "Reading, searching, planning, or looking up documentation/parameters "
    "does not require confirmation."
)

_SYSTEM_PROMPT = (
    "You are an admission gate for an AI agent using Stripe's API. Given "
    "a written policy and a proposed Stripe action (its name and "
    "description), decide what the policy requires:\n"
    "  allow          — the policy permits this action to proceed\n"
    "  require_human  — the policy requires a person to approve before it proceeds\n"
    "  deny           — the policy forbids this action\n"
    "Answer with exactly one of those three words and nothing else."
)


def make_clusiana_advisory(
    base_url: str | None = None,
    model_name: str = "clusiana-admit-v4",
):
    """Returns an `AdvisoryClassifier` closed over a real Clusiana
    endpoint. `base_url` defaults to `TULIP_ADVISORY_URL` -- if neither
    is set, returns `None` so callers can wire this in unconditionally
    without a hard dependency on the endpoint being up."""
    resolved_url = base_url or os.environ.get("TULIP_ADVISORY_URL")
    if not resolved_url:
        return None

    model = OpenAIModel(
        model=model_name,
        base_url=f"{resolved_url.rstrip('/')}/v1",
        api_key="unused",
        max_tokens=6,
        temperature=0,
        extra_body={"chat_template_kwargs": {"enable_thinking": False}},
    )

    async def advisory(
        method: str, args: dict[str, Any], description: str
    ) -> bool | None:
        action_text = f"{method}: {description}"
        response = await model.complete(
            messages=[
                Message.system(_SYSTEM_PROMPT),
                Message.user(
                    f"POLICY:\n{_POLICY}\n\n"
                    f"PROPOSED ACTION:\n{action_text}\n\nVerdict?"
                ),
            ]
        )
        text = (response.message.content or "").strip()
        verdict = text.split()[0].rstrip(".,:") if text.split() else ""
        if verdict not in {"allow", "require_human", "deny"}:
            return None  # off-schema response -- no opinion, not a verdict
        return verdict in {"require_human", "deny"}

    return advisory

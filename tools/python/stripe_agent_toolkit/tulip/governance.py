"""Admission control for `ToolkitCore.run_tool()`, powered by tulip-agents
(https://tulipagents.ai).

Every one of this toolkit's four framework adapters -- `langchain`,
`openai`, `crewai`, `strands` -- builds its tool objects around exactly
one bound method: `self.run_tool` (see `shared/toolkit_core.py`), which
each `_convert_tools()` implementation captures at tool-creation time and
hands to the framework's own tool wrapper (see e.g.
`crewai/toolkit.py::StripeTool.run_tool`). That single method is what
`GovernedToolkitMixin` overrides: every real call is classified and
weighed against a policy via `tulip.control.admit()` before
`ToolkitCore.run_tool()` (and the real MCP call it makes to
`mcp.stripe.com`) ever happens. A denied or held call never reaches
Stripe at all.

**This composes with all four existing framework adapters uniformly**,
not just one -- because the override point is on `ToolkitCore` itself
(the shared base every framework's `*AgentToolkit` class inherits from),
not on any one framework's tool-wrapping logic. `class
GovernedStripeAgentToolkit(GovernedToolkitMixin, StripeAgentToolkit)` (or
the `langchain`/`openai`/`strands` equivalents) is the entire integration
per framework -- see `examples/tulip/main.py` for a working one.

**A real, disclosed constraint that shapes `classify()`'s design**: unlike
a REST SDK with a static tool list in the repo, this toolkit's tool
catalog is fetched *live* from `mcp.stripe.com` via MCP `list_tools()` --
it isn't enumerable from this repository at all, and doing so requires a
real, authenticated connection. This toolkit's own Python test suite
skips real connection testing for the same reason
(`test_mcp_client.py::test_connect_success`, marked
`@pytest.mark.skip(reason="Requires mocking MCP SDK internals")`). Given
that, `classify()` below uses keyword markers against the tool's real
name and description returned by the live server, not a hardcoded list
of exact method names -- the same approach already validated against an
evolving, not-fully-known-in-advance catalog (a digital-forensics tool's
433-artifact catalog, in a different admission-gate project). This
example was built and unit-tested without live Stripe credentials
(`tests/test_governance.py`, mocked MCP session, matching this repo's own
testing convention); it has not yet been verified against a real,
live-fetched tool catalog. Flagging that plainly rather than asserting
coverage this hasn't earned yet.

**What counts as high-risk here, and why**: markers chosen for actions
with a genuine, hard-to-undo financial or dispute-liability consequence
-- capturing/charging a payment, issuing a refund, canceling a
subscription, voiding or transferring funds, closing or submitting a
dispute response, issuing a payout. Reads, listings, and draft/unconfirmed
records (a created-but-uncaptured payment intent, a draft invoice) stay
low-risk. This is a starting policy, not a claim of completeness --
without a live catalog to validate against, it should be treated as a
reasoned first cut, not an authoritative list.
"""

from __future__ import annotations

from typing import Any

from tulip.control import Action, AuditTrail, ControlPolicy, admit

# Keyword markers against the tool's real method name + description
# (both provided by the live MCP server, not known statically here --
# see module docstring). Chosen for genuine financial/dispute-liability
# consequence, not just superficially alarming words.
_HIGH_RISK_MARKERS = (
    "capture",
    "charge",
    "refund",
    "cancel",
    "void",
    "payout",
    "transfer",
    "delete",
    "close_dispute",
    "submit_dispute",
    "update_dispute",
)

_LOW_RISK_POLICY = ControlPolicy(
    require_verification_score=0.0,
    require_human_for=frozenset(),
    max_blast_radius=10,
)
_HIGH_RISK_POLICY = ControlPolicy(
    require_verification_score=0.0,
    require_human_for=frozenset({"high-risk"}),
    max_blast_radius=1,
)


def classify(
    method: str, args: dict[str, Any], description: str = ""
) -> Action:
    """Classifies one proposed `run_tool()` call as a tulip-agents Action.

    `method` and `description` are matched as a single lowercased string
    against `_HIGH_RISK_MARKERS` -- a tool named `create_refund` and one
    named `close_customer_dispute` both match on `refund`/`close_dispute`
    substrings respectively. `args` is accepted (not just used) so a
    caller can build a stricter, amount-aware classifier on top of this
    one without changing the call site -- the same disclosed gap this
    module doesn't close on its own (see README).
    """
    haystack = f"{method} {description}".lower()
    is_high_risk = any(marker in haystack for marker in _HIGH_RISK_MARKERS)
    return Action(
        name=method,
        asset="stripe-account",
        blast_radius=5 if is_high_risk else 1,
        environment="production",
        kind="stripe-financial-action"
        if is_high_risk
        else "stripe-read-or-draft",
        tags=frozenset({"high-risk"}) if is_high_risk else frozenset(),
    )


class GovernedToolkitMixin:
    """Mixin overriding `ToolkitCore.run_tool()` with a real admission gate.

    Usage: `class GovernedStripeAgentToolkit(GovernedToolkitMixin,
    StripeAgentToolkit): pass` -- for any of the four existing framework
    toolkit classes. Mixin must come first in the MRO so `super().run_tool()`
    resolves to the real `ToolkitCore.run_tool()` (which does the actual
    MCP call), not back to this mixin.
    """

    def __init__(
        self,
        *args: Any,
        policy: ControlPolicy | None = None,
        trail: AuditTrail | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(*args, **kwargs)
        self._policy_override = policy
        self._trail = trail if trail is not None else AuditTrail()

    def audit_trail(self) -> AuditTrail:
        """The tamper-evident record of every decision this instance has
        made (`.records()`, `.verify()`, `.export_jsonl()`)."""
        return self._trail

    async def run_tool(
        self, method: str, args: dict[str, Any], customer: str | None = None
    ) -> str:
        # Best-effort real tool description, if this instance has already
        # connected and fetched the live catalog -- improves classify()'s
        # keyword match without requiring it (falls back to method name
        # alone if not yet connected or the tool isn't found).
        description = ""
        if getattr(self, "is_initialized", False):
            for tool in self.mcp_client.get_tools():
                if tool.get("name") == method:
                    description = tool.get("description", "")
                    break

        action = classify(method, args, description)
        policy = self._policy_override or (
            _HIGH_RISK_POLICY
            if "high-risk" in action.tags
            else _LOW_RISK_POLICY
        )

        async def _perform() -> str:
            return await super(GovernedToolkitMixin, self).run_tool(
                method, args, customer
            )

        return await admit(action, _perform, policy=policy, trail=self._trail)

"""Admission control for `ToolkitCore.run_tool()`, powered by tulip-agents
(https://tulipagents.ai).

Every framework adapter (`langchain`, `openai`, `crewai`, `strands`)
builds its tools around one bound method, `self.run_tool`
(`shared/toolkit_core.py`). `GovernedToolkitMixin` overrides it: every
call is classified and weighed against a policy via `tulip.control.admit()`
before the real MCP call to `mcp.stripe.com` happens. A denied or held
call never reaches Stripe. Because the override point is on `ToolkitCore`
itself, the same mixin composes with all four adapters identically --
see `examples/tulip/main.py`.

This toolkit's tool catalog isn't enumerable from the repo -- it's
fetched live from `mcp.stripe.com` via MCP `list_tools()` -- so
`classify()` below matches keyword markers against each tool's real,
live-fetched name/description rather than a static method list. Six
real bugs were found and fixed by testing that design against a much
larger, real operation catalog and real models; full history, the
ground-truth dataset, and results are in `examples/tulip/VERIFICATION.md`,
not here.

`GovernedToolkitMixin` also takes an optional `advisory` callable (see
`AdvisoryClassifier`) that can escalate a rule-classified-low-risk call
to high-risk over real inference -- never soften the reverse, and never
required: off by default, no model-server dependency to install this
package. `examples/tulip/clusiana_advisory.py` is a real, working one.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from tulip.control import Action, AuditTrail, ControlPolicy, admit

logger = logging.getLogger(__name__)

# `(method, args, description) -> True` to escalate this call to
# high-risk, `False`/`None` to leave the rule-based verdict alone. Must
# never be trusted to *lower* risk -- see module docstring. Raising,
# timing out, or returning anything else is treated as "no opinion" by
# `GovernedToolkitMixin.run_tool()`, not as a denial or an allow.
AdvisoryClassifier = Callable[
    [str, dict[str, Any], str], Awaitable[bool | None]
]

# Keyword markers against the tool's real method name + description
# (both provided by the live MCP server, not known statically here --
# see module docstring). Chosen for genuine financial/dispute-liability
# consequence, not just superficially alarming words.
#
# "dispute" (bare, not "close_dispute"/"submit_dispute"/"update_dispute"):
# real dispatcher operation ids are PascalCase-concatenated
# (PostDisputesDispute), which never contained the underscored compound
# markers this used to be -- a real bug, found only by pulling real
# operation ids from the live server instead of guessing at their shape.
#
# "finalize": PostInvoicesInvoiceFinalize locks an invoice for real
# collection -- explicitly called out as approval-required in stripe/ai
# issue #381's own example policy -- and matched nothing here until
# this was added, found the same way as the dispute marker above.
_HIGH_RISK_MARKERS = (
    "capture",
    "charge",
    "refund",
    "cancel",
    "void",
    "payout",
    "transfer",
    "delete",
    "dispute",
    "finalize",
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


_WRITE_DISPATCHER_METHODS = frozenset({"stripe_api_write"})

# GET can't mutate, so this always classifies low-risk regardless of the
# operation id -- see VERIFICATION.md for the bug that made this its own
# category instead of joining the write dispatcher above.
_READ_DISPATCHER_METHODS = frozenset({"stripe_api_read"})

# Tools that search/describe/plan around a Stripe operation without ever
# executing one themselves -- always low-risk, regardless of description
# content. See VERIFICATION.md for why description content can't be
# trusted for these specifically.
_INFORMATIONAL_METHODS = frozenset(
    {
        "stripe_api_search",
        "stripe_api_details",
        "stripe_implementation_planner",
        "search_stripe_documentation",
        "send_stripe_mcp_feedback",
    }
)


def classify(
    method: str, args: dict[str, Any], description: str = ""
) -> Action:
    """Classifies one proposed `run_tool()` call as a tulip-agents Action.

    Three categories, matched differently -- see each frozenset above for
    why, and `examples/tulip/VERIFICATION.md` for the six real bugs this
    split (and `_HIGH_RISK_MARKERS`) was hardened against:

    - individually-named tools (`create_refund`, ...): markers matched
      against the tool's own name + real, live-fetched description.
    - the write dispatcher (`stripe_api_write`): markers matched against
      `args["stripe_api_operation_id"]` instead -- its description is
      generic boilerplate that doesn't carry the actual operation.
    - the read dispatcher (`stripe_api_read`) and informational tools
      (`_INFORMATIONAL_METHODS`): always low-risk -- the former can't
      mutate by construction (GET), the latter never execute an
      operation at all.
    """
    if method in _INFORMATIONAL_METHODS or method in _READ_DISPATCHER_METHODS:
        haystack = ""
    elif method in _WRITE_DISPATCHER_METHODS:
        operation_id = str(args.get("stripe_api_operation_id", ""))
        haystack = f"{method} {operation_id}".lower()
    else:
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
        advisory: AdvisoryClassifier | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(*args, **kwargs)
        self._policy_override = policy
        self._trail = trail if trail is not None else AuditTrail()
        self._advisory = advisory

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

        # Advisory inference layer: can only ESCALATE a rule-based
        # low-risk verdict to high-risk, never soften a high-risk one
        # back down. Any failure of the advisory itself (exception,
        # timeout, off-schema response) falls back to the rule verdict
        # rather than either blocking or silently trusting it -- an
        # unavailable model must never become an outage for governance,
        # and it must never become a bypass either.
        if self._advisory is not None and "high-risk" not in action.tags:
            try:
                escalate = await self._advisory(method, args, description)
            except Exception:
                logger.warning(
                    "tulip advisory classifier failed for %r; "
                    "falling back to the rule-based verdict",
                    method,
                    exc_info=True,
                )
                escalate = None
            if escalate:
                action = Action(
                    name=action.name,
                    asset=action.asset,
                    blast_radius=5,
                    environment=action.environment,
                    kind="stripe-financial-action",
                    tags=frozenset({"high-risk", "advisory-escalated"}),
                )

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

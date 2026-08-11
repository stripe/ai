"""Real tests for `stripe_agent_toolkit.tulip.governance` -- no real
Stripe/MCP connection, matching this repo's own testing convention for
`StripeMcpClient` (mock what `test_mcp_client.py` itself marks
`@pytest.mark.skip(reason="Requires mocking MCP SDK internals")` for,
rather than skipping it here too).

Uses a minimal concrete `ToolkitCore` subclass -- the same shape
`shared/toolkit_core.py`'s own docstring shows as the intended extension
point -- with `_mcp_client.call_tool` mocked directly, so these tests
exercise the real `GovernedToolkitMixin.run_tool()` override and its
MRO/`super()` chain against `ToolkitCore`'s real (unmodified) `run_tool()`
body, not a reimplementation of it.

**`unittest.TestCase`/`IsolatedAsyncioTestCase`, not bare pytest
functions**: this repo's CI (`Makefile`'s `test` target) runs `python -m
unittest discover tests`, which only collects `TestCase` subclasses --
plain pytest-style classes/functions (as several other files in this
directory use) are silently never executed under that invocation, a
real, pre-existing gap in this repo confirmed by running `make test`
locally. Written this way so these tests genuinely run in CI rather than
passing by never being collected.
"""

from typing import Any
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock

from tulip.control import AdmissionError

from stripe_agent_toolkit.configuration import Configuration
from stripe_agent_toolkit.shared.toolkit_core import ToolkitCore
from stripe_agent_toolkit.tulip.governance import (
    GovernedToolkitMixin,
    classify,
)


class _MinimalToolkit(ToolkitCore[list]):
    """Smallest real subclass of ToolkitCore -- matches the pattern its
    own docstring documents as the intended extension point."""

    def _empty_tools(self) -> list:
        return []

    def _convert_tools(self, mcp_tools: list) -> list:
        return list(mcp_tools)


class _GovernedTestToolkit(GovernedToolkitMixin, _MinimalToolkit):
    pass


def _toolkit(
    policy: Any | None = None, advisory: Any | None = None
) -> _GovernedTestToolkit:
    toolkit = _GovernedTestToolkit(
        secret_key="rk_test_123",
        configuration=Configuration(),
        policy=policy,
        advisory=advisory,
    )
    # Bypass real MCP connect(): mark both the toolkit's own initializer
    # and the underlying StripeMcpClient's (a separate AsyncInitializer
    # instance) as initialized, and stub the client's call directly --
    # same shape this repo's own tests use to avoid a live connection.
    toolkit._initializer._initialized = True  # type: ignore[attr-defined]
    toolkit._mcp_client._initializer._initialized = True  # type: ignore[attr-defined]
    toolkit._mcp_client.call_tool = AsyncMock()  # type: ignore[method-assign]
    return toolkit


class TestClassify(TestCase):
    """Sync tests for `classify()` directly -- no toolkit needed. Each
    regresses a real bug found against the live server; see
    `examples/tulip/VERIFICATION.md` for the full story on each."""

    def test_write_dispatcher_classifies_on_operation_id(self) -> None:
        """Bug 1: a refund routed through `stripe_api_write` used to be
        misclassified low-risk, since the operation id -- not the tool
        name or its generic description -- carries the actual action."""
        action = classify(
            "stripe_api_write",
            {"stripe_api_operation_id": "PostRefunds", "parameters": {}},
            "",  # description must not matter here
        )
        self.assertIn("high-risk", action.tags)

    def test_write_dispatcher_ignores_boilerplate_description(self) -> None:
        """Bug 2: the dispatcher's fixed description mentions "DELETE",
        which used to blanket-flag every write including harmless ones."""
        boilerplate = "...POST/PATCH/PUT/DELETE operation..."
        action = classify(
            "stripe_api_write",
            {"stripe_api_operation_id": "PostCustomers", "parameters": {}},
            boilerplate,
        )
        self.assertNotIn("high-risk", action.tags)

    def test_informational_tool_ignores_example_text_in_description(
        self,
    ) -> None:
        """Bug 3: `stripe_api_search`'s description mentions "payout
        methods" as an example phrase, which used to blanket-flag this
        harmless search tool."""
        real_description = (
            'Search for Stripe API operations... e.g. "payout methods"...'
        )
        action = classify("stripe_api_search", {}, real_description)
        self.assertNotIn("high-risk", action.tags)

    def test_read_dispatcher_ignores_operation_id_markers(self) -> None:
        """Bug 4: `GetCharges` (a harmless read) used to match the
        `charge` marker via substring in the operation id. GET can't
        mutate, so the read dispatcher is always low-risk now."""
        action = classify(
            "stripe_api_read",
            {"stripe_api_operation_id": "GetCharges", "parameters": {}},
            "Read data from any Stripe API GET operation...",
        )
        self.assertNotIn("high-risk", action.tags)

    def test_write_dispatcher_flags_real_dispute_update(self) -> None:
        """Bug 5: the real operation id for submitting/updating a
        dispute is PascalCase-concatenated (PostDisputesDispute) and
        never matched the old underscored markers
        (close_dispute/submit_dispute/update_dispute) -- a real,
        never-firing marker set, found by pulling real operation ids
        from the live server instead of guessing at their shape."""
        action = classify(
            "stripe_api_write",
            {
                "stripe_api_operation_id": "PostDisputesDispute",
                "parameters": {},
            },
            "Update a dispute",
        )
        self.assertIn("high-risk", action.tags)

    def test_write_dispatcher_flags_invoice_finalization(self) -> None:
        """Bug 6: finalizing an invoice locks it for real collection --
        called out as approval-required in stripe/ai#381's own example
        policy -- but matched no marker until "finalize" was added."""
        action = classify(
            "stripe_api_write",
            {
                "stripe_api_operation_id": "PostInvoicesInvoiceFinalize",
                "parameters": {},
            },
            "Finalize an invoice",
        )
        self.assertIn("high-risk", action.tags)


class TestGovernedToolkitMixin(IsolatedAsyncioTestCase):
    async def test_low_risk_call_executes_for_real(self) -> None:
        toolkit = _toolkit()
        toolkit._mcp_client.call_tool.return_value = '{"id": "cus_123"}'

        result = await toolkit.run_tool("list_customers", {})

        self.assertEqual(result, '{"id": "cus_123"}')
        toolkit._mcp_client.call_tool.assert_awaited_once_with(
            "list_customers", {}, None
        )
        [record] = toolkit.audit_trail().records()
        self.assertEqual(record.payload["outcome"], "allow")

    async def test_high_risk_call_is_held_not_executed(self) -> None:
        toolkit = _toolkit()

        with self.assertRaises(AdmissionError) as excinfo:
            await toolkit.run_tool("capture_payment_intent", {"id": "pi_1"})

        self.assertEqual(excinfo.exception.decision.outcome, "require_human")
        toolkit._mcp_client.call_tool.assert_not_awaited()

        [record] = toolkit.audit_trail().records()
        self.assertEqual(record.payload["outcome"], "require_human")

    async def test_high_risk_uses_live_tool_description_when_available(
        self,
    ) -> None:
        """A tool whose NAME alone doesn't match any marker, but whose
        real, live-fetched description does, must still be flagged --
        confirms classify() genuinely uses the live catalog's
        description, not just the method string."""
        toolkit = _toolkit()
        toolkit._mcp_client._tools = [
            {
                "name": "adjust_balance_txn",
                "description": (
                    "Issue a refund adjustment on a balance transaction"
                ),
            }
        ]

        with self.assertRaises(AdmissionError):
            await toolkit.run_tool("adjust_balance_txn", {})

        toolkit._mcp_client.call_tool.assert_not_awaited()

    async def test_customer_override_is_passed_through_on_allow(
        self,
    ) -> None:
        toolkit = _toolkit()
        toolkit._mcp_client.call_tool.return_value = "{}"

        await toolkit.run_tool("list_customers", {}, customer="cus_override")

        toolkit._mcp_client.call_tool.assert_awaited_once_with(
            "list_customers", {}, "cus_override"
        )

    async def test_refund_via_generic_dispatcher_is_held_not_executed(
        self,
    ) -> None:
        """End-to-end version of the two `TestClassify` regression tests
        above, through the real `run_tool()` override."""
        toolkit = _toolkit()

        with self.assertRaises(AdmissionError):
            await toolkit.run_tool(
                "stripe_api_write",
                {
                    "stripe_api_operation_id": "PostRefunds",
                    "parameters": {"charge": "ch_1"},
                },
            )

        toolkit._mcp_client.call_tool.assert_not_awaited()

    async def test_audit_trail_survives_mixed_decisions_and_verifies(
        self,
    ) -> None:
        toolkit = _toolkit()
        toolkit._mcp_client.call_tool.return_value = "{}"

        await toolkit.run_tool("list_customers", {})
        try:
            await toolkit.run_tool("create_refund", {"id": "ch_1"})
        except AdmissionError:
            pass

        trail = toolkit.audit_trail()
        self.assertEqual(len(trail.records()), 2)
        self.assertTrue(trail.verify())


class TestAdvisoryClassifier(IsolatedAsyncioTestCase):
    """The optional inference-based advisory layer (see governance.py's
    module docstring): escalate-only, and fails safe to the rule-based
    verdict on any advisory error -- never the reverse in either case."""

    async def test_advisory_escalates_a_rule_classified_low_risk_call(
        self,
    ) -> None:
        async def advisory(method, args, description):
            return True  # "I think this is high-risk", overriding classify()

        toolkit = _toolkit(advisory=advisory)

        with self.assertRaises(AdmissionError) as excinfo:
            # list_customers alone classifies low-risk by the rules.
            await toolkit.run_tool("list_customers", {})

        self.assertEqual(excinfo.exception.decision.outcome, "require_human")
        toolkit._mcp_client.call_tool.assert_not_awaited()

    async def test_advisory_saying_no_leaves_low_risk_call_allowed(
        self,
    ) -> None:
        async def advisory(method, args, description):
            return False

        toolkit = _toolkit(advisory=advisory)
        toolkit._mcp_client.call_tool.return_value = "{}"

        result = await toolkit.run_tool("list_customers", {})

        self.assertEqual(result, "{}")
        toolkit._mcp_client.call_tool.assert_awaited_once()

    async def test_advisory_never_consulted_for_already_high_risk_call(
        self,
    ) -> None:
        calls: list[str] = []

        async def advisory(method, args, description):
            calls.append(method)
            return False  # would be ignored even if it fired

        toolkit = _toolkit(advisory=advisory)

        with self.assertRaises(AdmissionError):
            await toolkit.run_tool("create_refund", {"id": "ch_1"})

        # capture_payment_intent/create_refund is already high-risk by
        # the rules -- the advisory must never get a chance to soften it.
        self.assertEqual(calls, [])

    async def test_advisory_failure_falls_back_to_rule_verdict(
        self,
    ) -> None:
        async def broken_advisory(method, args, description):
            raise RuntimeError("model endpoint unreachable")

        toolkit = _toolkit(advisory=broken_advisory)
        toolkit._mcp_client.call_tool.return_value = "{}"

        # Must not raise the advisory's own exception -- an unavailable
        # model must never become an outage for a low-risk call.
        result = await toolkit.run_tool("list_customers", {})

        self.assertEqual(result, "{}")

    async def test_advisory_off_schema_response_falls_back_to_rule_verdict(
        self,
    ) -> None:
        async def off_schema_advisory(method, args, description):
            return None  # "no opinion", not a verdict

        toolkit = _toolkit(advisory=off_schema_advisory)
        toolkit._mcp_client.call_tool.return_value = "{}"

        result = await toolkit.run_tool("list_customers", {})

        self.assertEqual(result, "{}")

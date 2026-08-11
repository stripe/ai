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
"""

from typing import Any
from unittest.mock import AsyncMock

import pytest
from tulip.control import AdmissionError

from stripe_agent_toolkit.configuration import Configuration
from stripe_agent_toolkit.shared.toolkit_core import ToolkitCore
from stripe_agent_toolkit.tulip.governance import GovernedToolkitMixin


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
    policy: Any | None = None,
) -> _GovernedTestToolkit:
    toolkit = _GovernedTestToolkit(
        secret_key="rk_test_123",
        configuration=Configuration(),
        policy=policy,
    )
    # Bypass real MCP connect(): mark both the toolkit's own initializer
    # and the underlying StripeMcpClient's (a separate AsyncInitializer
    # instance) as initialized, and stub the client's call directly --
    # same shape this repo's own tests use to avoid a live connection.
    toolkit._initializer._initialized = True  # type: ignore[attr-defined]
    toolkit._mcp_client._initializer._initialized = True  # type: ignore[attr-defined]
    toolkit._mcp_client.call_tool = AsyncMock()  # type: ignore[method-assign]
    return toolkit


@pytest.fixture(autouse=True)
def _reset() -> None:
    yield


async def test_low_risk_call_executes_for_real() -> None:
    toolkit = _toolkit()
    toolkit._mcp_client.call_tool.return_value = '{"id": "cus_123"}'

    result = await toolkit.run_tool("list_customers", {})

    assert result == '{"id": "cus_123"}'
    toolkit._mcp_client.call_tool.assert_awaited_once_with(
        "list_customers", {}, None
    )
    [record] = toolkit.audit_trail().records()
    assert record.payload["outcome"] == "allow"


async def test_high_risk_call_is_held_not_executed() -> None:
    toolkit = _toolkit()

    with pytest.raises(AdmissionError) as excinfo:
        await toolkit.run_tool("capture_payment_intent", {"id": "pi_1"})

    assert excinfo.value.decision.outcome == "require_human"
    toolkit._mcp_client.call_tool.assert_not_awaited()

    [record] = toolkit.audit_trail().records()
    assert record.payload["outcome"] == "require_human"


async def test_high_risk_uses_live_tool_description_when_available() -> None:
    """A tool whose NAME alone doesn't match any marker, but whose real,
    live-fetched description does, must still be flagged -- confirms
    classify() genuinely uses the live catalog's description, not just
    the method string."""
    toolkit = _toolkit()
    toolkit._mcp_client._tools = [
        {
            "name": "adjust_balance_txn",
            "description": "Issue a refund adjustment on a balance transaction",
        }
    ]

    with pytest.raises(AdmissionError):
        await toolkit.run_tool("adjust_balance_txn", {})

    toolkit._mcp_client.call_tool.assert_not_awaited()


async def test_customer_override_is_passed_through_on_allow() -> None:
    toolkit = _toolkit()
    toolkit._mcp_client.call_tool.return_value = "{}"

    await toolkit.run_tool("list_customers", {}, customer="cus_override")

    toolkit._mcp_client.call_tool.assert_awaited_once_with(
        "list_customers", {}, "cus_override"
    )


async def test_audit_trail_survives_mixed_decisions_and_verifies() -> None:
    toolkit = _toolkit()
    toolkit._mcp_client.call_tool.return_value = "{}"

    await toolkit.run_tool("list_customers", {})
    try:
        await toolkit.run_tool("create_refund", {"id": "ch_1"})
    except AdmissionError:
        pass

    trail = toolkit.audit_trail()
    assert len(trail.records()) == 2
    assert trail.verify() is True

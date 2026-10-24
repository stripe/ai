"""Tests for paid MCP tool registration."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from stripe_agent_toolkit.mcp import register_paid_tool


def _base_options() -> dict:
    return {
        "payment_reason": "Paid tool access",
        "meter_event": None,
        "stripe_secret_key": "sk_test_123",
        "user_email": "user@example.com",
        "checkout": {
            "line_items": [{"price": "price_123", "quantity": 1}],
            "mode": "payment",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel",
        },
    }


class FakeServer:
    """Simple MCP server mock with decorator tool registration."""

    def __init__(self):
        self.tool = MagicMock(side_effect=self._tool)
        self.registered_callback = None

    def _tool(self, name, description, params_schema):
        def decorator(callback):
            self.registered_callback = callback
            return callback

        return decorator


@pytest.mark.asyncio
async def test_registers_tool_on_mcp_server():
    server = FakeServer()
    options = _base_options()
    callback = AsyncMock(return_value={"content": []})

    stripe_client = MagicMock()
    mock_stripe = MagicMock()
    mock_stripe.StripeClient.return_value = stripe_client

    with patch(
        "stripe_agent_toolkit.mcp.register_paid_tool.stripe",
        mock_stripe,
    ):
        await register_paid_tool(
            server,
            "my_tool",
            "My paid tool",
            {"type": "object"},
            callback,
            options,
        )

    server.tool.assert_called_once_with(
        "my_tool",
        "My paid tool",
        {"type": "object"},
    )
    assert server.registered_callback is not None


@pytest.mark.asyncio
async def test_creates_customer_when_none_exists():
    server = FakeServer()
    options = _base_options()
    callback = AsyncMock(
        return_value={"content": [{"type": "text", "text": "ok"}]}
    )

    stripe_client = MagicMock()
    stripe_client.customers.list = AsyncMock(return_value={"data": []})
    stripe_client.customers.create = AsyncMock(return_value={"id": "cus_new"})
    stripe_client.checkout.sessions.list = AsyncMock(
        return_value={
            "data": [
                {
                    "metadata": {"toolName": "my_tool"},
                    "payment_status": "paid",
                    "subscription": None,
                }
            ]
        }
    )

    mock_stripe = MagicMock()
    mock_stripe.StripeClient.return_value = stripe_client

    with patch(
        "stripe_agent_toolkit.mcp.register_paid_tool.stripe",
        mock_stripe,
    ):
        await register_paid_tool(
            server,
            "my_tool",
            "desc",
            {"type": "object"},
            callback,
            options,
        )
        result = await server.registered_callback({})

    stripe_client.customers.create.assert_awaited_once_with(
        {"email": "user@example.com"}
    )
    callback.assert_awaited_once()
    assert result["content"][0]["text"] == "ok"


@pytest.mark.asyncio
async def test_creates_checkout_session_for_unpaid_tool():
    server = FakeServer()
    options = _base_options()
    callback = AsyncMock(
        return_value={"content": [{"type": "text", "text": "ok"}]}
    )

    stripe_client = MagicMock()
    stripe_client.customers.list = AsyncMock(
        return_value={"data": [{"id": "cus_123", "email": "user@example.com"}]}
    )
    stripe_client.checkout.sessions.list = AsyncMock(return_value={"data": []})
    stripe_client.checkout.sessions.create = AsyncMock(
        return_value={"url": "https://checkout.stripe.com/test"}
    )

    mock_stripe = MagicMock()
    mock_stripe.StripeClient.return_value = stripe_client

    with patch(
        "stripe_agent_toolkit.mcp.register_paid_tool.stripe",
        mock_stripe,
    ):
        await register_paid_tool(
            server,
            "my_tool",
            "desc",
            {"type": "object"},
            callback,
            options,
        )
        result = await server.registered_callback({})

    callback.assert_not_called()
    payload = json.loads(result["content"][0]["text"])
    assert payload["status"] == "payment_required"
    assert payload["data"]["checkoutUrl"] == "https://checkout.stripe.com/test"
    assert payload["data"]["paymentType"] == "oneTimeSubscription"


@pytest.mark.asyncio
async def test_usage_based_meter_event_recorded():
    server = FakeServer()
    options = _base_options()
    options["meter_event"] = "tool_usage"
    callback = AsyncMock(
        return_value={"content": [{"type": "text", "text": "ok"}]}
    )

    stripe_client = MagicMock()
    stripe_client.customers.list = AsyncMock(
        return_value={"data": [{"id": "cus_123", "email": "user@example.com"}]}
    )
    stripe_client.checkout.sessions.list = AsyncMock(
        return_value={
            "data": [
                {
                    "metadata": {"toolName": "my_tool"},
                    "payment_status": "paid",
                    "subscription": None,
                }
            ]
        }
    )
    stripe_client.billing = SimpleNamespace(
        meter_events=SimpleNamespace(create=AsyncMock(return_value={}))
    )

    mock_stripe = MagicMock()
    mock_stripe.StripeClient.return_value = stripe_client

    with patch(
        "stripe_agent_toolkit.mcp.register_paid_tool.stripe",
        mock_stripe,
    ):
        await register_paid_tool(
            server,
            "my_tool",
            "desc",
            {"type": "object"},
            callback,
            options,
        )
        await server.registered_callback({})

    stripe_client.billing.meter_events.create.assert_awaited_once_with(
        {
            "event_name": "tool_usage",
            "payload": {"stripe_customer_id": "cus_123", "value": "1"},
        }
    )
    callback.assert_awaited_once()


@pytest.mark.asyncio
async def test_missing_price_id_raises_error():
    server = FakeServer()
    options = _base_options()
    options["checkout"]["line_items"] = [{"quantity": 1}]
    callback = AsyncMock(return_value={"content": []})

    with pytest.raises(ValueError, match="Price ID is required"):
        await register_paid_tool(
            server,
            "my_tool",
            "desc",
            {"type": "object"},
            callback,
            options,
        )

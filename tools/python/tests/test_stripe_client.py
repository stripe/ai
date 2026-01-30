"""Tests for StripeClient."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from stripe_agent_toolkit.shared.stripe_client import StripeClient


class TestStripeClient:
    """Tests for StripeClient class."""

    def test_init(self):
        """Should initialize without error."""
        with patch("stripe.set_app_info"):
            client = StripeClient("rk_test_123")
            assert not client.is_initialized

    def test_init_with_context(self):
        """Should accept context options."""
        with patch("stripe.set_app_info"):
            client = StripeClient(
                "rk_test_123",
                context={
                    "account": "acct_test",
                    "customer": "cus_test"
                }
            )
            assert not client.is_initialized

    async def test_get_remote_tools_before_init_raises(self):
        """Should raise if get_remote_tools called before initialize."""
        with patch("stripe.set_app_info"):
            client = StripeClient("rk_test_123")

        with pytest.raises(RuntimeError, match="not initialized"):
            client.get_remote_tools()

    async def test_run_before_init_raises(self):
        """Should raise if run called before initialize."""
        with patch("stripe.set_app_info"):
            client = StripeClient("rk_test_123")

        with pytest.raises(RuntimeError, match="not initialized"):
            await client.run("test_method", {})

    async def test_close_safe_before_init(self):
        """Close should be safe to call before initialize."""
        with patch("stripe.set_app_info"):
            client = StripeClient("rk_test_123")

        # Should not raise
        await client.close()

    def test_create_meter_event(self):
        """Should create meter event via Stripe SDK."""
        with patch("stripe.set_app_info"), \
             patch("stripe.billing.MeterEvent.create") as mock_create:
            client = StripeClient("rk_test_123")
            client.create_meter_event(
                event="api_calls",
                customer="cus_test_123"
            )

            mock_create.assert_called_once_with(
                event_name="api_calls",
                payload={"stripe_customer_id": "cus_test_123"}
            )

    def test_create_meter_event_with_value(self):
        """Should include value in meter event."""
        with patch("stripe.set_app_info"), \
             patch("stripe.billing.MeterEvent.create") as mock_create:
            client = StripeClient("rk_test_123")
            client.create_meter_event(
                event="tokens",
                customer="cus_test_123",
                value="100"
            )

            mock_create.assert_called_once_with(
                event_name="tokens",
                payload={
                    "stripe_customer_id": "cus_test_123",
                    "value": "100"
                }
            )

    def test_create_meter_event_with_account(self):
        """Should include stripe_account for Connect."""
        with patch("stripe.set_app_info"), \
             patch("stripe.billing.MeterEvent.create") as mock_create:
            client = StripeClient(
                "rk_test_123",
                context={"account": "acct_test_123"}
            )
            client.create_meter_event(
                event="api_calls",
                customer="cus_test_123"
            )

            mock_create.assert_called_once_with(
                event_name="api_calls",
                payload={"stripe_customer_id": "cus_test_123"},
                stripe_account="acct_test_123"
            )

    def test_app_info_toolkit_header(self):
        """Should set toolkit app info by default."""
        with patch("stripe.set_app_info") as mock_set_app:
            client = StripeClient("rk_test_123")

            mock_set_app.assert_called_once()
            call_args = mock_set_app.call_args
            assert "stripe-agent-toolkit-python" in str(call_args)

    def test_app_info_mcp_header(self):
        """Should set MCP app info when mode is modelcontextprotocol."""
        with patch("stripe.set_app_info") as mock_set_app:
            client = StripeClient(
                "rk_test_123",
                context={"mode": "modelcontextprotocol"}
            )

            mock_set_app.assert_called_once()
            call_args = mock_set_app.call_args
            assert "stripe-mcp-python" in str(call_args)

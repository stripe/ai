"""Tests for StripeClient."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from stripe_agent_toolkit.shared.stripe_client import StripeClient


class TestStripeClient:
    """Tests for StripeClient class."""

    def test_init(self):
        """Should initialize without error."""
        client = StripeClient("rk_test_123")
        assert not client.is_initialized

    def test_init_with_context(self):
        """Should accept context options."""
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
        client = StripeClient("rk_test_123")

        with pytest.raises(RuntimeError, match="not initialized"):
            client.get_remote_tools()

    async def test_run_before_init_raises(self):
        """Should raise if run called before initialize."""
        client = StripeClient("rk_test_123")

        with pytest.raises(RuntimeError, match="not initialized"):
            await client.run("test_method", {})

    async def test_close_safe_before_init(self):
        """Close should be safe to call before initialize."""
        client = StripeClient("rk_test_123")

        # Should not raise
        await client.close()

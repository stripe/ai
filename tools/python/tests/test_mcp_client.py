"""Tests for StripeMcpClient."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from stripe_agent_toolkit.shared.mcp_client import StripeMcpClient


class TestStripeMcpClient:
    """Tests for StripeMcpClient class."""

    def test_init_with_rk_key(self):
        """Should accept rk_* API keys without warning."""
        with patch("warnings.warn") as mock_warn:
            client = StripeMcpClient({
                "secret_key": "rk_test_123"
            })
            mock_warn.assert_not_called()

    def test_init_with_sk_key_warns(self):
        """Should emit recommendation warning for sk_* API keys."""
        with patch("warnings.warn") as mock_warn:
            client = StripeMcpClient({
                "secret_key": "sk_test_123"
            })
            mock_warn.assert_called_once()
            assert "strongly recommend" in str(mock_warn.call_args).lower()

    def test_init_invalid_key_raises(self):
        """Should raise error for invalid API key prefix."""
        with pytest.raises(ValueError, match="Invalid API key"):
            StripeMcpClient({
                "secret_key": "invalid_key_123"
            })

    def test_get_tools_before_connect_raises(self):
        """Should raise if get_tools called before connect."""
        client = StripeMcpClient({
            "secret_key": "rk_test_123"
        })

        with pytest.raises(RuntimeError, match="not connected"):
            client.get_tools()

    async def test_call_tool_before_connect_raises(self):
        """Should raise if call_tool called before connect."""
        client = StripeMcpClient({
            "secret_key": "rk_test_123"
        })

        with pytest.raises(RuntimeError, match="not connected"):
            await client.call_tool("test_tool", {})

    @pytest.mark.skip(reason="Requires mocking MCP SDK internals")
    async def test_connect_success(self):
        """Should connect to MCP server successfully."""
        # This test would require extensive mocking of the MCP SDK
        pass

    @pytest.mark.skip(reason="Requires mocking MCP SDK internals")
    async def test_call_tool_with_customer_override(self):
        """Should include customer in tool args when provided."""
        # This test would require extensive mocking of the MCP SDK
        pass


class TestMcpClientConfig:
    """Tests for config storage."""

    def test_config_stores_account(self):
        """Config should store account."""
        client = StripeMcpClient({
            "secret_key": "rk_test_123",
            "account": "acct_test_123"
        })

        # The config is stored internally for use during connect
        assert client._config.get("account") == "acct_test_123"

    def test_config_stores_customer(self):
        """Config should store customer."""
        client = StripeMcpClient({
            "secret_key": "rk_test_123",
            "customer": "cus_test_123"
        })

        assert client._config.get("customer") == "cus_test_123"

    def test_config_stores_mode(self):
        """Config should store mode."""
        client = StripeMcpClient({
            "secret_key": "rk_test_123",
            "mode": "modelcontextprotocol"
        })

        assert client._config.get("mode") == "modelcontextprotocol"

"""Tests for ToolkitCore base class."""

import sys
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Mock missing dependencies before importing from stripe_agent_toolkit
mcp_mock = MagicMock()
sys.modules["mcp"] = mcp_mock
sys.modules["mcp.client.streamable_http"] = MagicMock()

pydantic_mock = MagicMock()
sys.modules["pydantic"] = pydantic_mock

# typing_extensions might be available, but let's be safe
try:
    from typing_extensions import TypedDict
except ImportError:
    typing_extensions_mock = MagicMock()
    typing_extensions_mock.TypedDict = MagicMock
    sys.modules["typing_extensions"] = typing_extensions_mock

import pytest
from typing import List, Dict, Any

from stripe_agent_toolkit.shared.toolkit_core import ToolkitCore

# Re-define McpTool since we mocked mcp
McpTool = Dict[str, Any]

class MockToolkit(ToolkitCore[List[str]]):
    """A concrete implementation of ToolkitCore for testing."""

    def _empty_tools(self) -> List[str]:
        return []

    def _convert_tools(self, mcp_tools: List[McpTool]) -> List[str]:
        return [t["name"] for t in mcp_tools]


class TestToolkitCore:
    """Tests for ToolkitCore logic."""

    @pytest.fixture
    def mock_mcp_client(self):
        """Mock the StripeMcpClient."""
        with patch("stripe_agent_toolkit.shared.toolkit_core.StripeMcpClient") as mock:
            client_instance = mock.return_value
            client_instance.connect = AsyncMock()
            client_instance.disconnect = AsyncMock()
            client_instance.get_tools.return_value = [
                {"name": "tool1", "description": "desc1"},
                {"name": "tool2", "description": "desc2"},
            ]
            client_instance.call_tool = AsyncMock(return_value="result")
            yield client_instance

    def test_initialization(self, mock_mcp_client):
        """Should initialize correctly and convert tools."""
        toolkit = MockToolkit(secret_key="rk_test_123")

        assert not toolkit.is_initialized
        assert toolkit._tools == []

        asyncio.run(toolkit.initialize())

        assert toolkit.is_initialized
        mock_mcp_client.connect.assert_called_once()
        assert toolkit.get_tools() == ["tool1", "tool2"]

    def test_get_tools_raises_if_not_initialized(self, mock_mcp_client):
        """Should raise RuntimeError if get_tools is called before initialization."""
        toolkit = MockToolkit(secret_key="rk_test_123")

        with pytest.raises(RuntimeError, match="not initialized"):
            toolkit.get_tools()

    def test_run_tool(self, mock_mcp_client):
        """Should delegate run_tool to mcp_client."""
        toolkit = MockToolkit(secret_key="rk_test_123")
        asyncio.run(toolkit.initialize())

        result = asyncio.run(toolkit.run_tool("tool1", {"arg": "val"}))

        assert result == "result"
        mock_mcp_client.call_tool.assert_called_once_with("tool1", {"arg": "val"}, None)

    def test_run_tool_with_customer_override(self, mock_mcp_client):
        """Should pass customer override to mcp_client."""
        toolkit = MockToolkit(secret_key="rk_test_123")
        asyncio.run(toolkit.initialize())

        asyncio.run(toolkit.run_tool("tool1", {}, customer="cus_123"))

        mock_mcp_client.call_tool.assert_called_once_with("tool1", {}, "cus_123")

    def test_run_tool_raises_if_not_initialized(self, mock_mcp_client):
        """Should raise RuntimeError if run_tool is called before initialization."""
        toolkit = MockToolkit(secret_key="rk_test_123")

        with pytest.raises(RuntimeError, match="not initialized"):
            asyncio.run(toolkit.run_tool("tool1", {}))

    def test_close(self, mock_mcp_client):
        """Should disconnect and reset state when closed."""
        toolkit = MockToolkit(secret_key="rk_test_123")
        asyncio.run(toolkit.initialize())

        assert toolkit.is_initialized
        assert toolkit.get_tools() == ["tool1", "tool2"]

        asyncio.run(toolkit.close())

        assert not toolkit.is_initialized
        mock_mcp_client.disconnect.assert_called_once()
        # State should be reset
        assert toolkit._tools == []
        with pytest.raises(RuntimeError, match="not initialized"):
            toolkit.get_tools()

    def test_close_if_not_initialized(self, mock_mcp_client):
        """Closing an uninitialized toolkit should be a no-op."""
        toolkit = MockToolkit(secret_key="rk_test_123")

        asyncio.run(toolkit.close())

        mock_mcp_client.disconnect.assert_not_called()

    def test_mcp_client_property(self, mock_mcp_client):
        """Should expose the mcp_client instance."""
        toolkit = MockToolkit(secret_key="rk_test_123")
        assert toolkit.mcp_client == mock_mcp_client

    def test_warn_if_not_initialized(self, mock_mcp_client):
        """Should warn when accessing tools via deprecated method before initialization."""
        toolkit = MockToolkit(secret_key="rk_test_123")

        with pytest.warns(UserWarning, match="Accessing tools before initialization"):
            tools = toolkit._get_tools_with_warning()
            assert tools == []

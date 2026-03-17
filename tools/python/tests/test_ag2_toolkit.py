"""Tests for the AG2 toolkit adapter."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from stripe_agent_toolkit.ag2.toolkit import (
    StripeAgentToolkit,
    create_stripe_agent_toolkit,
)


@pytest.fixture
def mock_mcp_client():
    client = MagicMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.call_tool = AsyncMock(return_value='{"id": "ch_123"}')
    return client


@pytest.fixture
def toolkit(mock_mcp_client):
    with patch(
        "stripe_agent_toolkit.shared.toolkit_core.StripeMcpClient",
        return_value=mock_mcp_client,
    ):
        return StripeAgentToolkit("rk_test_key")


MCP_TOOLS = [
    {
        "name": "list_charges",
        "description": "List recent charges",
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Number of charges",
                },
            },
            "required": ["limit"],
        },
    },
    {
        "name": "create_refund",
        "description": "Create a refund",
        "inputSchema": {
            "type": "object",
            "properties": {
                "charge": {
                    "type": "string",
                    "description": "Charge ID to refund",
                },
            },
            "required": ["charge"],
        },
    },
]


class TestEmptyTools:
    def test_returns_empty_list(self, toolkit):
        assert toolkit._empty_tools() == []


class TestConvertTools:
    def test_converts_all_tools(self, toolkit):
        tools = toolkit._convert_tools(MCP_TOOLS)
        assert len(tools) == 2

    def test_preserves_name(self, toolkit):
        tools = toolkit._convert_tools(MCP_TOOLS)
        assert tools[0].name == "list_charges"
        assert tools[1].name == "create_refund"

    def test_preserves_description(self, toolkit):
        tools = toolkit._convert_tools(MCP_TOOLS)
        assert tools[0].description == "List recent charges"

    def test_missing_description_falls_back_to_name(self, toolkit):
        tools = toolkit._convert_tools([{"name": "some_tool"}])
        assert tools[0].description == "some_tool"

    def test_tool_callable(self, toolkit, mock_mcp_client):
        tools = toolkit._convert_tools(MCP_TOOLS)
        # Tool function should be callable
        assert callable(tools[0].func)


class TestToolExecution:
    def test_calls_mcp_run_tool(self, toolkit, mock_mcp_client):
        tools = toolkit._convert_tools(MCP_TOOLS)
        result = tools[0].func(limit=10)
        mock_mcp_client.call_tool.assert_called_once_with(
            "list_charges", {"limit": 10}, None
        )
        assert result == '{"id": "ch_123"}'


class TestFactory:
    @pytest.mark.asyncio
    async def test_creates_initialized_toolkit(self, mock_mcp_client):
        with patch(
            "stripe_agent_toolkit.shared.toolkit_core.StripeMcpClient",
            return_value=mock_mcp_client,
        ):
            mock_mcp_client.get_tools = MagicMock(return_value=MCP_TOOLS)
            toolkit = await create_stripe_agent_toolkit("rk_test_key")
            assert toolkit.is_initialized
            assert len(toolkit.get_tools()) == 2
            await toolkit.close()

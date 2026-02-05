"""Stripe Agent Toolkit for OpenAI Agents SDK."""

import json
from typing import List, Optional, Any

from agents import FunctionTool
from agents.run_context import RunContextWrapper

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..configuration import Configuration


class StripeAgentToolkit(ToolkitCore[List[FunctionTool]]):
    """
    Stripe Agent Toolkit for OpenAI Agents SDK.

    Example:
        toolkit = await create_stripe_agent_toolkit(
            secret_key='rk_test_...',
        )
        tools = toolkit.get_tools()
        agent = Agent(name="Stripe Agent", tools=tools)
        await toolkit.close()
    """

    def __init__(
        self,
        secret_key: str,
        configuration: Optional[Configuration] = None
    ):
        super().__init__(secret_key, configuration)

    def _empty_tools(self) -> List[FunctionTool]:
        """Return empty list of tools."""
        return []

    def _convert_tools(
        self,
        mcp_tools: List[McpTool]
    ) -> List[FunctionTool]:
        """Convert MCP tools to OpenAI FunctionTool instances."""
        tools = []
        for mcp_tool in mcp_tools:
            tools.append(self._create_function_tool(mcp_tool))
        return tools

    def _create_function_tool(self, mcp_tool: McpTool) -> FunctionTool:
        """Create a FunctionTool from an MCP tool definition."""
        toolkit = self
        tool_name = mcp_tool["name"]

        async def on_invoke_tool(
            ctx: RunContextWrapper[Any],
            input_str: str
        ) -> str:
            args = json.loads(input_str)
            return await toolkit.run_tool(tool_name, args)

        # Prepare parameters schema
        parameters = dict(mcp_tool.get("inputSchema", {}))
        parameters["additionalProperties"] = False
        parameters["type"] = "object"

        # Clean up schema - remove fields not needed in OpenAI function schema
        for key in ["description", "title"]:
            parameters.pop(key, None)

        if "properties" in parameters:
            for prop in parameters["properties"].values():
                for key in ["title", "default"]:
                    if isinstance(prop, dict):
                        prop.pop(key, None)

        return FunctionTool(
            name=tool_name,
            description=mcp_tool.get("description", tool_name),
            params_json_schema=parameters,
            on_invoke_tool=on_invoke_tool,
            strict_json_schema=False
        )

    @property
    def tools(self) -> List[FunctionTool]:
        """
        The tools available in the toolkit.

        .. deprecated::
            Access tools via get_tools() after calling initialize().
        """
        return self._get_tools_with_warning()


async def create_stripe_agent_toolkit(
    secret_key: str,
    configuration: Optional[Configuration] = None
) -> StripeAgentToolkit:
    """
    Factory function to create and initialize a StripeAgentToolkit.

    This is the recommended way to create a toolkit as it handles
    async initialization automatically.

    Example:
        toolkit = await create_stripe_agent_toolkit(
            secret_key='rk_test_...',
        )
        tools = toolkit.get_tools()

        # Use with agent
        agent = Agent(name="Stripe Agent", tools=tools)

        # Clean up when done
        await toolkit.close()

    Args:
        secret_key: Stripe API key (rk_* recommended, sk_* deprecated)
        configuration: Optional configuration for context

    Returns:
        Initialized StripeAgentToolkit ready to use
    """
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit

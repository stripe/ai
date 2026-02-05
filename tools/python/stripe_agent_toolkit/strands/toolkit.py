"""Stripe Agent Toolkit for Strands."""

import asyncio
import json
from typing import List, Optional, Dict, Any, Callable, Awaitable

from strands.tools.tools import PythonAgentTool as StrandTool

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..configuration import Configuration


def create_strand_tool(
    run_tool: Callable[..., Awaitable[str]],
    mcp_tool: McpTool
) -> "StrandTool":
    """Create a Strand tool from MCP tool definition."""
    tool_name = mcp_tool.get("name", "")

    # Prepare parameters schema
    input_schema = mcp_tool.get("inputSchema") or {}
    parameters: Dict[str, Any] = dict(input_schema)
    parameters["additionalProperties"] = False
    parameters["type"] = "object"

    # Clean up schema
    for key in ["description", "title"]:
        parameters.pop(key, None)

    properties = parameters.get("properties")
    if isinstance(properties, dict):
        for prop in properties.values():
            for key in ["title", "default"]:
                if isinstance(prop, dict):
                    prop.pop(key, None)

    def callback_wrapper(tool_input: Any, **kwargs: Any) -> Dict[str, Any]:
        """Wrapper to handle additional parameters from strands framework."""

        # Extract toolUseId for the response
        tool_use_id = None
        actual_params: Dict[str, Any] = {}

        if isinstance(tool_input, dict) and "toolUseId" in tool_input:
            tool_use_id = tool_input["toolUseId"]
            # Extract the actual parameters from the nested input structure
            actual_params = tool_input.get("input", {})
        elif isinstance(tool_input, str):
            # Parse JSON string input
            try:
                parsed = json.loads(tool_input)
                tool_use_id = parsed.get("toolUseId")
                actual_params = parsed.get("input", parsed)
            except json.JSONDecodeError:
                actual_params = {}
        elif isinstance(tool_input, dict):
            actual_params = tool_input.copy()

        # Call the MCP client (need to run async in sync context)
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    run_tool(tool_name, actual_params)
                )
                result = future.result()
        else:
            result = loop.run_until_complete(
                run_tool(tool_name, actual_params)
            )

        # Return in the format expected by strands
        response: Dict[str, Any] = {
            "content": [{"text": result}]
        }

        if tool_use_id:
            response["toolUseId"] = tool_use_id

        return response

    return StrandTool(
        tool_name=tool_name,
        tool_spec={
            "name": tool_name,
            "description": mcp_tool.get("description", tool_name),
            "inputSchema": {
                "json": parameters
            }
        },
        callback=callback_wrapper
    )


class StripeAgentToolkit(ToolkitCore[List[StrandTool]]):
    """
    Stripe Agent Toolkit for Strands.

    Example:
        toolkit = await create_stripe_agent_toolkit(
            secret_key='rk_test_...',
        )
        tools = toolkit.get_tools()
        await toolkit.close()
    """

    def __init__(
        self,
        secret_key: str,
        configuration: Optional[Configuration] = None
    ):
        super().__init__(secret_key, configuration)

    def _empty_tools(self) -> List[StrandTool]:
        """Return empty list of tools."""
        return []

    def _convert_tools(
        self,
        mcp_tools: List[McpTool]
    ) -> List[StrandTool]:
        """Convert MCP tools to Strands StrandTool instances."""
        return [
            create_strand_tool(self.run_tool, t)
            for t in mcp_tools
        ]

    @property
    def tools(self) -> List[StrandTool]:
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

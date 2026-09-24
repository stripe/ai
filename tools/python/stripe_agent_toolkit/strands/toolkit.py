"""Stripe Agent Toolkit for Strands."""

from typing import List, Optional, Dict, Any, Callable, Awaitable

from strands.tools.tools import PythonAgentTool as StrandTool
from strands.types.tools import ToolResult, ToolUse

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

    async def tool_func(tool_use: ToolUse, **_: Any) -> ToolResult:
        """Run the MCP tool for a Strands tool use request.

        Strands awaits coroutine tool functions on the agent's own event
        loop, so no sync/async bridging is needed here. Exceptions are
        converted to an error ToolResult by the Strands tool executor.
        """
        result = await run_tool(tool_name, tool_use.get("input", {}))
        return {
            "toolUseId": tool_use["toolUseId"],
            "status": "success",
            "content": [{"text": result}],
        }

    return StrandTool(
        tool_name=tool_name,
        tool_spec={
            "name": tool_name,
            "description": mcp_tool.get("description", tool_name),
            "inputSchema": {
                "json": parameters
            }
        },
        tool_func=tool_func
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
        secret_key: Stripe API key (rk_* strongly recommended over sk_*)
        configuration: Optional configuration for context

    Returns:
        Initialized StripeAgentToolkit ready to use
    """
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit

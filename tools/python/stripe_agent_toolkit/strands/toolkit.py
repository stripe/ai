"""Stripe Agent Toolkit for Strands."""

import asyncio
import json
from typing import List, Optional, Dict, Any

from strands.tools.tools import PythonAgentTool as StrandTool

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..shared.stripe_client import StripeClient
from ..configuration import Configuration
from .hooks import BillingHooks


def create_strand_tool(
    stripe_client: StripeClient,
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

        # Call the Stripe MCP client (need to run async in sync context)
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    stripe_client.run(tool_name, actual_params)
                )
                result = future.result()
        else:
            result = loop.run_until_complete(
                stripe_client.run(tool_name, actual_params)
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
            configuration={'actions': {'customers': {'create': True}}}
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
            create_strand_tool(self._stripe, t)
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

    def billing_hook(
        self,
        type: Optional[str] = None,
        customer: Optional[str] = None,
        meter: Optional[str] = None,
        meters: Optional[Dict[str, str]] = None
    ) -> BillingHooks:
        """
        Create a billing hook for usage metering.

        Args:
            type: Type of billing - "outcome" or "token"
            customer: Stripe customer ID
            meter: Single meter event name for outcome-based billing
            meters: Dict with 'input' and 'output' meter names for token billing

        Returns:
            BillingHooks instance for use with Strands agents
        """
        return BillingHooks(self._stripe, type, customer, meter, meters)


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
            configuration={'actions': {'customers': {'create': True}}}
        )
        tools = toolkit.get_tools()
        await toolkit.close()

    Args:
        secret_key: Stripe API key (rk_* recommended, sk_* deprecated)
        configuration: Optional configuration for actions and context

    Returns:
        Initialized StripeAgentToolkit ready to use
    """
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit

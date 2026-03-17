"""Stripe Agent Toolkit for AG2 (formerly AutoGen)."""

import asyncio
import concurrent.futures
from typing import Any

from autogen.tools import Tool

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..configuration import Configuration


class StripeAgentToolkit(ToolkitCore[list[Tool]]):
    """Stripe Agent Toolkit for AG2 (formerly AutoGen).

    Example:
        toolkit = await create_stripe_agent_toolkit(
            secret_key='rk_test_...',
        )
        tools = toolkit.get_tools()

        from autogen import ConversableAgent
        agent = ConversableAgent(name="billing", llm_config=llm_config)
        for tool in tools:
            tool.register_tool(agent)

        await toolkit.close()
    """

    def __init__(
        self,
        secret_key: str,
        configuration: Configuration | None = None,
    ):
        super().__init__(secret_key, configuration)
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

    def _empty_tools(self) -> list[Tool]:
        return []

    def _convert_tools(self, mcp_tools: list[McpTool]) -> list[Tool]:
        return [self._create_tool(t) for t in mcp_tools]

    def _create_tool(self, mcp_tool: McpTool) -> Tool:
        tool_name = mcp_tool["name"]
        description = mcp_tool.get("description", tool_name)
        run = self.run_tool
        executor = self._executor

        def call_stripe(**kwargs: Any) -> str:
            """Execute a Stripe tool via MCP."""
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                return asyncio.run(run(tool_name, kwargs))
            # Already in async context — run in thread pool
            future = executor.submit(asyncio.run, run(tool_name, kwargs))
            return future.result()

        call_stripe.__name__ = tool_name
        call_stripe.__doc__ = description

        return Tool(
            name=tool_name,
            description=description,
            func_or_tool=call_stripe,
            parameters_json_schema=mcp_tool.get("inputSchema"),
        )

    async def close(self) -> None:
        """Close MCP connection and thread pool."""
        self._executor.shutdown(wait=False)
        await super().close()

    @property
    def tools(self) -> list[Tool]:
        """
        The tools available in the toolkit.

        .. deprecated::
            Access tools via get_tools() after calling initialize().
        """
        return self._get_tools_with_warning()


async def create_stripe_agent_toolkit(
    secret_key: str,
    configuration: Configuration | None = None,
) -> StripeAgentToolkit:
    """Create and initialize a StripeAgentToolkit for AG2.

    Args:
        secret_key: Stripe API key (rk_* recommended over sk_*)
        configuration: Optional Stripe configuration

    Returns:
        Initialized StripeAgentToolkit
    """
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit

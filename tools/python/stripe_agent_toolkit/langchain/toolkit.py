"""Stripe Agent Toolkit for LangChain."""

import asyncio
from typing import List, Optional, Any, Type, Callable, Awaitable

from pydantic import BaseModel
from langchain.tools import BaseTool

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..shared.schema_utils import json_schema_to_pydantic_model
from ..configuration import Configuration


class StripeTool(BaseTool):
    """Tool for interacting with Stripe via MCP."""

    run_tool: Callable[..., Awaitable[str]]
    method: str
    name: str = ""
    description: str = ""
    args_schema: Optional[Type[BaseModel]] = None

    def _run(self, **kwargs: Any) -> str:
        """Synchronous execution - wraps async call."""
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a new loop
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(
                    asyncio.run,
                    self.run_tool(self.method, kwargs)
                )
                return future.result()
        else:
            return loop.run_until_complete(
                self.run_tool(self.method, kwargs)
            )

    async def _arun(self, **kwargs: Any) -> str:
        """Async execution via MCP."""
        return await self.run_tool(self.method, kwargs)


class StripeAgentToolkit(ToolkitCore[List[StripeTool]]):
    """
    Stripe Agent Toolkit for LangChain.

    Example:
        toolkit = await create_stripe_agent_toolkit(
            secret_key='rk_test_...',
        )
        tools = toolkit.get_tools()
        agent = create_react_agent(llm, tools, prompt)
        await toolkit.close()
    """

    def __init__(
        self,
        secret_key: str,
        configuration: Optional[Configuration] = None
    ):
        super().__init__(secret_key, configuration)

    def _empty_tools(self) -> List[StripeTool]:
        """Return empty list of tools."""
        return []

    def _convert_tools(
        self,
        mcp_tools: List[McpTool]
    ) -> List[StripeTool]:
        """Convert MCP tools to LangChain StripeTool instances."""
        tools = []
        for mcp_tool in mcp_tools:
            # Convert JSON Schema to Pydantic model
            args_schema = json_schema_to_pydantic_model(
                mcp_tool.get("inputSchema"),
                model_name=f"{mcp_tool['name']}_args"
            )

            tools.append(StripeTool(
                run_tool=self.run_tool,
                method=mcp_tool["name"],
                name=mcp_tool["name"],
                description=mcp_tool.get("description", mcp_tool["name"]),
                args_schema=args_schema,
            ))
        return tools

    @property
    def tools(self) -> List[StripeTool]:
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

        # Use with LangChain agent
        agent = create_react_agent(llm, tools, prompt)

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

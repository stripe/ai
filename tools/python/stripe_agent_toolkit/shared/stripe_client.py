"""Unified client for Stripe operations via MCP."""

from typing import Optional, Dict, Any, List

from .mcp_client import StripeMcpClient, McpTool
from .async_initializer import AsyncInitializer
from ..configuration import Context


class StripeClient:
    """
    Unified client for Stripe operations via MCP.

    All tool operations are executed via MCP (mcp.stripe.com).

    Example:
        client = StripeClient('rk_test_...', context)
        await client.initialize()
        tools = client.get_remote_tools()
        result = await client.run('create_customer', {'email': 'test@example.com'})
        await client.close()
    """

    def __init__(
        self,
        secret_key: str,
        context: Optional[Context] = None
    ):
        self._context = context or {}
        self._initializer = AsyncInitializer()

        # MCP client for all tool operations
        self._mcp_client = StripeMcpClient({
            "secret_key": secret_key,
            "account": self._context.get("account"),
            "customer": self._context.get("customer"),
            "mode": self._context.get("mode"),
        })

    async def initialize(self) -> None:
        """Async initialization - connects to MCP server."""
        await self._initializer.initialize(self._mcp_client.connect)

    @property
    def is_initialized(self) -> bool:
        """Check if client is initialized."""
        return self._initializer.is_initialized

    def get_remote_tools(self) -> List[McpTool]:
        """Get tools from MCP server (after initialization)."""
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "StripeClient not initialized. "
                "Call initialize() before accessing tools."
            )
        return self._mcp_client.get_tools()

    async def run(
        self,
        method: str,
        args: Dict[str, Any],
        customer: Optional[str] = None
    ) -> str:
        """
        Execute a tool via MCP.

        Args:
            method: Tool method name (e.g., 'create_customer')
            args: Tool arguments
            customer: Optional per-call customer override

        Returns:
            JSON string result
        """
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "StripeClient not initialized. "
                "Call initialize() before running tools."
            )
        return await self._mcp_client.call_tool(method, args, customer)

    async def close(self) -> None:
        """Close MCP connection. Safe to call multiple times."""
        if not self._initializer.is_initialized:
            return

        await self._mcp_client.disconnect()
        self._initializer.reset()

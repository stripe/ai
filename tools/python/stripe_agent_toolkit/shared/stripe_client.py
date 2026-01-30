"""Unified client for Stripe operations via MCP."""

import stripe
from typing import Optional, Dict, Any, List

from .mcp_client import StripeMcpClient, McpTool
from .async_initializer import AsyncInitializer
from .constants import VERSION, TOOLKIT_HEADER, MCP_HEADER
from ..configuration import Context


class StripeClient:
    """
    Unified client for Stripe operations.

    - Tool execution: All tools are executed via MCP (mcp.stripe.com)
    - Billing: Uses direct Stripe SDK for meter events (middleware billing)

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

        # Stripe SDK only used for create_meter_event (billing middleware)
        stripe.api_key = secret_key

        # Determine app info based on mode
        app_name = (
            MCP_HEADER
            if self._context.get("mode") == "modelcontextprotocol"
            else TOOLKIT_HEADER
        )
        stripe.set_app_info(
            app_name,
            version=VERSION,
            url="https://github.com/stripe/ai",
        )

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

    def create_meter_event(
        self,
        event: str,
        customer: str,
        value: Optional[str] = None
    ) -> None:
        """
        Create a billing meter event.
        Uses direct Stripe SDK (not MCP) for billing middleware.

        Args:
            event: The meter event name
            customer: Stripe customer ID
            value: Optional value for the meter event
        """
        meter_event_data: Dict[str, Any] = {
            "event_name": event,
            "payload": {
                "stripe_customer_id": customer,
            },
        }

        if value is not None:
            meter_event_data["payload"]["value"] = value

        account = self._context.get("account")
        if account:
            meter_event_data["stripe_account"] = account

        stripe.billing.MeterEvent.create(**meter_event_data)

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

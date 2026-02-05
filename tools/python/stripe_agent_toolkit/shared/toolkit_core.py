"""Base class for all Stripe Agent Toolkit implementations."""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional, Dict, Any
import warnings

from .mcp_client import StripeMcpClient, McpTool
from .async_initializer import AsyncInitializer
from ..configuration import Configuration

T = TypeVar("T")


class ToolkitCore(ABC, Generic[T]):
    """
    Base class for all Stripe Agent Toolkit implementations.

    Subclasses override _convert_tools() to transform MCP tools
    into framework-specific formats.

    Example:
        class MyToolkit(ToolkitCore[List[MyTool]]):
            def _empty_tools(self) -> List[MyTool]:
                return []

            def _convert_tools(self, mcp_tools: List[McpTool]) -> List[MyTool]:
                return [MyTool(t) for t in mcp_tools]

        toolkit = MyToolkit('rk_test_...')
        await toolkit.initialize()
        tools = toolkit.get_tools()
        await toolkit.close()
    """

    def __init__(
        self,
        secret_key: str,
        configuration: Optional[Configuration] = None
    ):
        self._configuration = configuration or {}
        context = self._configuration.get("context") or {}
        self._mcp_client = StripeMcpClient({
            "secret_key": secret_key,
            "account": context.get("account"),
            "customer": context.get("customer"),
            "mode": context.get("mode"),
        })
        self._initializer = AsyncInitializer()
        self._tools: T = self._empty_tools()

    @abstractmethod
    def _empty_tools(self) -> T:
        """
        Return the empty value for tools (e.g., [], {}).
        Called during initialization before tools are loaded.
        """
        pass

    @abstractmethod
    def _convert_tools(self, mcp_tools: List[McpTool]) -> T:
        """
        Convert MCP tools to framework-specific format.

        Args:
            mcp_tools: List of tools from MCP server

        Returns:
            Framework-specific tool collection
        """
        pass

    async def initialize(self) -> None:
        """
        Initialize the toolkit by connecting to MCP server and fetching tools.

        This must be called before using get_tools() or running tool calls.
        """
        await self._initializer.initialize(self._do_initialize)

    async def _do_initialize(self) -> None:
        """Internal initialization logic."""
        await self._mcp_client.connect()
        mcp_tools = self._mcp_client.get_tools()
        self._tools = self._convert_tools(mcp_tools)

    @property
    def is_initialized(self) -> bool:
        """Check if toolkit is initialized."""
        return self._initializer.is_initialized

    def get_tools(self) -> T:
        """
        Get tools, throwing if not initialized.

        Raises:
            RuntimeError: If initialize() has not been called.
        """
        self._ensure_initialized()
        return self._tools

    def _get_tools_with_warning(self) -> T:
        """
        Get tools with a warning if not initialized.
        Used for deprecated property access.
        """
        self._warn_if_not_initialized()
        return self._tools

    async def close(self) -> None:
        """
        Close the MCP connection and clean up resources.
        Safe to call multiple times.
        """
        if not self._initializer.is_initialized:
            return

        await self._mcp_client.disconnect()
        self._initializer.reset()
        self._tools = self._empty_tools()

    def _ensure_initialized(self) -> None:
        """Throw an error if not initialized."""
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "StripeAgentToolkit not initialized. "
                "Call await toolkit.initialize() first."
            )

    def _warn_if_not_initialized(self) -> None:
        """Warn if accessing tools before initialization."""
        if not self._initializer.is_initialized:
            warnings.warn(
                "[StripeAgentToolkit] Accessing tools before initialization. "
                "Call await toolkit.initialize() first, or use "
                "create_stripe_agent_toolkit() factory. "
                "Tools will be empty until initialized."
            )

    @property
    def mcp_client(self) -> StripeMcpClient:
        """
        The MCP client that handles connections and tool execution.
        """
        return self._mcp_client

    async def run_tool(
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
        self._ensure_initialized()
        return await self._mcp_client.call_tool(method, args, customer)

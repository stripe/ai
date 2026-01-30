"""Base class for all Stripe Agent Toolkit implementations."""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional
import warnings

from .stripe_client import StripeClient
from .mcp_client import McpTool
from .async_initializer import AsyncInitializer
from ..configuration import Configuration, is_tool_allowed_by_name

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

        toolkit = MyToolkit('rk_test_...', configuration)
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
        self._stripe = StripeClient(
            secret_key,
            self._configuration.get("context")
        )
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
        await self._stripe.initialize()

        remote_tools = self._stripe.get_remote_tools()
        filtered_tools = [
            t for t in remote_tools
            if is_tool_allowed_by_name(t.get("name", ""), self._configuration)
        ]

        self._tools = self._convert_tools(filtered_tools)

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

        await self._stripe.close()
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
    def stripe(self) -> StripeClient:
        """
        Access to the underlying StripeClient.
        Useful for billing operations like create_meter_event().
        """
        return self._stripe

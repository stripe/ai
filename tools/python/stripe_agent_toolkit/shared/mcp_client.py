"""Client for connecting to Stripe MCP server at mcp.stripe.com."""

import json
import warnings
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any, AsyncGenerator, Tuple
from typing_extensions import TypedDict

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from .async_initializer import AsyncInitializer
from .constants import VERSION, MCP_SERVER_URL, TOOLKIT_HEADER, MCP_HEADER


class McpToolInputSchema(TypedDict, total=False):
    """JSON Schema for MCP tool input."""

    type: str
    properties: Dict[str, Any]
    required: List[str]


class McpTool(TypedDict, total=False):
    """MCP tool definition."""

    name: str
    description: str
    inputSchema: McpToolInputSchema


class McpClientConfig(TypedDict, total=False):
    """Configuration for MCP client."""

    secret_key: str
    account: Optional[str]
    customer: Optional[str]
    mode: Optional[str]  # 'modelcontextprotocol' | 'toolkit'


class StripeMcpClient:
    """
    Client for connecting to Stripe MCP server at mcp.stripe.com.
    Fetches tool definitions and executes tool calls via MCP protocol.
    """

    def __init__(self, config: McpClientConfig):
        self._config = config
        self._tools: List[McpTool] = []
        self._initializer = AsyncInitializer()

        self._validate_key(config["secret_key"])

    def _validate_key(self, key: str) -> None:
        """Validate API key format and emit warnings."""
        if not key:
            raise ValueError("API key is required.")

        if not key.startswith("sk_") and not key.startswith("rk_"):
            raise ValueError(
                "Invalid API key format. "
                "Expected sk_* (secret key) or rk_* (restricted key)."
            )

        if key.startswith("sk_"):
            warnings.warn(
                "[DEPRECATION WARNING] Using sk_* keys with Stripe MCP is being deprecated. "
                "Please switch to rk_* (restricted keys) for better security. "
                "See: https://docs.stripe.com/keys#create-restricted-api-keys",
                DeprecationWarning,
                stacklevel=3
            )

    def _get_headers(self) -> Dict[str, str]:
        """Build headers for MCP requests."""
        user_agent = (
            f"{MCP_HEADER}/{VERSION}"
            if self._config.get("mode") == "modelcontextprotocol"
            else f"{TOOLKIT_HEADER}/{VERSION}"
        )

        headers = {
            "Authorization": f"Bearer {self._config['secret_key']}",
            "User-Agent": user_agent,
        }

        if self._config.get("account"):
            headers["Stripe-Account"] = self._config["account"]

        return headers

    @asynccontextmanager
    async def _create_session(self) -> AsyncGenerator[ClientSession, None]:
        """Create an MCP session within a proper async context.

        This ensures the connection lifecycle is managed correctly by
        using async with blocks, avoiding task group context issues.
        """
        headers = self._get_headers()

        async with streamablehttp_client(
            MCP_SERVER_URL,
            headers=headers,
            terminate_on_close=False
        ) as (read_stream, write_stream, _):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                yield session

    async def connect(self) -> None:
        """Connect to MCP server and fetch available tools."""
        await self._initializer.initialize(self._do_connect)

    async def _do_connect(self) -> None:
        """Internal connection logic."""
        try:
            async with self._create_session() as session:
                result = await session.list_tools()
                self._tools = [
                    McpTool(
                        name=t.name,
                        description=t.description or t.name,
                        inputSchema=t.inputSchema,
                    )
                    for t in result.tools
                ]
        except Exception as e:
            raise RuntimeError(
                f"Failed to connect to Stripe MCP server at {MCP_SERVER_URL}. "
                f"No fallback to direct SDK is available. "
                f"Error: {str(e)}"
            ) from e

    @property
    def is_connected(self) -> bool:
        """Check if connected to MCP server."""
        return self._initializer.is_initialized

    def get_tools(self) -> List[McpTool]:
        """Get available tools. Must call connect() first."""
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "MCP client not connected. "
                "Call connect() before accessing tools."
            )
        return self._tools

    async def call_tool(
        self,
        name: str,
        args: Dict[str, Any],
        customer: Optional[str] = None
    ) -> str:
        """
        Execute a tool via MCP.

        Args:
            name: Tool method name (e.g., 'create_customer')
            args: Tool arguments
            customer: Optional per-call customer override

        Returns:
            JSON string result
        """
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "MCP client not connected. "
                "Call connect() before calling tools."
            )

        # Customer priority: per-call override > connection-time context > none
        final_customer = customer or self._config.get("customer")

        # Warn if args.customer exists and differs from override
        if (
            final_customer
            and args.get("customer")
            and args["customer"] != final_customer
        ):
            warnings.warn(
                f"[Stripe Agent Toolkit] Customer context conflict detected:\n"
                f"  - Tool args.customer: {args['customer']}\n"
                f"  - Override customer: {final_customer}\n"
                f"  Using override customer. "
                f"This may indicate a bug in your code."
            )

        # Inject customer into args if present
        final_args = {**args}
        if final_customer:
            final_args["customer"] = final_customer

        try:
            async with self._create_session() as session:
                result = await session.call_tool(name, final_args)

                if result.isError:
                    error_text = next(
                        (
                            getattr(c, "text", None)
                            for c in result.content
                            if hasattr(c, "text")
                        ),
                        "Tool execution failed"
                    )
                    raise RuntimeError(str(error_text))

                # Extract text content
                text_content = next(
                    (
                        getattr(c, "text", None)
                        for c in result.content
                        if hasattr(c, "text")
                    ),
                    None
                )

                if text_content:
                    return text_content

                return json.dumps(result.model_dump())

        except Exception as e:
            raise RuntimeError(
                f"Failed to execute tool '{name}': {str(e)}"
            ) from e

    async def disconnect(self) -> None:
        """Disconnect from MCP server. Safe to call multiple times.

        Note: With the new architecture, connections are opened and closed
        per-operation, so this just resets the initialized state.
        """
        if not self._initializer.is_initialized:
            return

        self._tools = []
        self._initializer.reset()

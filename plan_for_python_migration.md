# Python Migration Plan: API to MCP Architecture

This document provides a comprehensive plan for migrating the Python `stripe-agent-toolkit` from direct API calls to the MCP (Model Context Protocol) architecture, mirroring the changes made in the TypeScript implementation.

---

## Executive Summary

The TypeScript migration introduced these core architectural changes:
1. **MCP Client**: A new `StripeMcpClient` class that connects to `mcp.stripe.com` to fetch tools and execute operations
2. **Async Initialization**: All toolkits now require async initialization before use
3. **Factory Functions**: New `create_stripe_agent_toolkit()` factory functions for simpler instantiation
4. **Tool Conversion**: Tools are fetched remotely and converted to framework-specific formats
5. **Shared Core**: A `ToolkitCore` base class that all framework implementations extend
6. **Schema Conversion**: JSON Schema to framework-specific validation (Zod in TS, Pydantic in Python)

---

## Phase 1: Create Shared Infrastructure

### 1.1 Create `stripe_agent_toolkit/shared/constants.py`

**Purpose**: Centralize version and URL constants.

```python
# File: stripe_agent_toolkit/shared/constants.py

VERSION = "0.7.0"  # Bump version for MCP migration
MCP_SERVER_URL = "https://mcp.stripe.com"
TOOLKIT_HEADER = "stripe-agent-toolkit-python"
MCP_HEADER = "stripe-mcp-python"
```

**Reference**: TypeScript `src/shared/constants.ts` (lines 1-12)

---

### 1.2 Create `stripe_agent_toolkit/shared/async_initializer.py`

**Purpose**: Utility class for async initialization with promise/future locking. Ensures initialization runs only once even with concurrent calls.

**Implementation Details**:
- Use `asyncio.Lock` for thread-safe concurrent initialization
- Track initialization state with `_initialized` boolean
- Store pending initialization future in `_init_future`
- Allow retry after failure by resetting the future
- Provide `reset()` method for cleanup

```python
# File: stripe_agent_toolkit/shared/async_initializer.py

import asyncio
from typing import Callable, Awaitable, Optional


class AsyncInitializer:
    """
    A reusable utility for async initialization with future locking.
    Ensures initialization runs only once, even if called concurrently.
    """

    def __init__(self):
        self._initialized: bool = False
        self._init_future: Optional[asyncio.Future] = None
        self._lock: asyncio.Lock = asyncio.Lock()

    async def initialize(self, do_initialize: Callable[[], Awaitable[None]]) -> None:
        """
        Initialize using the provided coroutine function.
        - If already initialized, returns immediately
        - If initialization in progress, awaits existing future
        - If initialization fails, allows retry on next call
        """
        if self._initialized:
            return

        async with self._lock:
            # Double-check after acquiring lock
            if self._initialized:
                return

            if self._init_future is not None:
                # Another coroutine is initializing, wait for it
                await self._init_future
                return

            # Create a new future for this initialization attempt
            loop = asyncio.get_event_loop()
            self._init_future = loop.create_future()

            try:
                await do_initialize()
                self._initialized = True
                self._init_future.set_result(None)
            except Exception as e:
                # Reset future on failure to allow retry
                self._init_future.set_exception(e)
                self._init_future = None
                raise

    @property
    def is_initialized(self) -> bool:
        return self._initialized

    def reset(self) -> None:
        """Reset the initializer state. Used during close/cleanup."""
        self._initialized = False
        self._init_future = None
```

**Reference**: TypeScript `src/shared/async-initializer.ts` (lines 1-52)

**Test file**: Create `tests/test_async_initializer.py` with tests for:
- Starting uninitialized
- Successful initialization
- Not re-initializing if already initialized
- Handling concurrent initialization calls (only runs once)
- Allowing retry after failure
- Reset behavior
- Re-initialization after reset

---

### 1.3 Create `stripe_agent_toolkit/shared/mcp_client.py`

**Purpose**: Client for connecting to `mcp.stripe.com`, fetching tools, and executing tool calls.

**Implementation Details**:
- Use the `mcp` Python SDK (`pip install mcp`)
- Implement `StripeMcpClient` class with:
  - Constructor that validates API key (sk_* or rk_*)
  - `connect()` method using `AsyncInitializer`
  - `get_tools()` method returning list of `McpTool` typed dicts
  - `call_tool()` method for executing tools
  - `disconnect()` method for cleanup
- Handle customer context (connection-time and per-call overrides)
- Emit deprecation warning for `sk_*` keys

```python
# File: stripe_agent_toolkit/shared/mcp_client.py

import warnings
from typing import Optional, List, Dict, Any, TypedDict
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from .async_initializer import AsyncInitializer
from .constants import VERSION, MCP_SERVER_URL, TOOLKIT_HEADER, MCP_HEADER


class McpToolInputSchema(TypedDict, total=False):
    type: str
    properties: Dict[str, Any]
    required: List[str]


class McpTool(TypedDict, total=False):
    name: str
    description: str
    inputSchema: McpToolInputSchema


class McpClientConfig(TypedDict, total=False):
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
        self._session: Optional[ClientSession] = None
        self._tools: List[McpTool] = []
        self._initializer = AsyncInitializer()

        self._validate_key(config["secret_key"])

    def _validate_key(self, key: str) -> None:
        if not key:
            raise ValueError("API key is required.")

        if not key.startswith("sk_") and not key.startswith("rk_"):
            raise ValueError(
                "Invalid API key format. Expected sk_* (secret key) or rk_* (restricted key)."
            )

        if key.startswith("sk_"):
            warnings.warn(
                "[DEPRECATION WARNING] Using sk_* keys with agent-toolkit is deprecated. "
                "Please switch to rk_* (restricted keys) for better security. "
                "See: https://docs.stripe.com/keys#create-restricted-api-keys",
                DeprecationWarning,
                stacklevel=3
            )

    async def connect(self) -> None:
        """Connect to MCP server and fetch available tools."""
        await self._initializer.initialize(self._do_connect)

    async def _do_connect(self) -> None:
        """Internal connection logic."""
        try:
            # Determine User-Agent based on mode
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

            # Create MCP client session
            async with streamablehttp_client(MCP_SERVER_URL, headers=headers) as (
                read_stream,
                write_stream,
                _,
            ):
                async with ClientSession(read_stream, write_stream) as session:
                    self._session = session
                    await session.initialize()

                    # Fetch tools
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
            self._session = None
            raise RuntimeError(
                f"Failed to connect to Stripe MCP server at {MCP_SERVER_URL}. "
                f"No fallback to direct SDK is available. "
                f"Error: {str(e)}"
            ) from e

    @property
    def is_connected(self) -> bool:
        return self._initializer.is_initialized

    def get_tools(self) -> List[McpTool]:
        """Get available tools. Must call connect() first."""
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "MCP client not connected. Call connect() before accessing tools."
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
        if not self._initializer.is_initialized or not self._session:
            raise RuntimeError(
                "MCP client not connected. Call connect() before calling tools."
            )

        # Customer priority: per-call override > connection-time context > none
        final_customer = customer or self._config.get("customer")

        # Warn if args.customer exists and differs from override
        if final_customer and args.get("customer") and args["customer"] != final_customer:
            warnings.warn(
                f"[Stripe Agent Toolkit] Customer context conflict detected:\n"
                f"  - Tool args.customer: {args['customer']}\n"
                f"  - Override customer: {final_customer}\n"
                f"  Using override customer. This may indicate a bug in your code."
            )

        # Inject customer into args if present
        final_args = {**args}
        if final_customer:
            final_args["customer"] = final_customer

        try:
            result = await self._session.call_tool(name, final_args)

            if result.isError:
                error_text = next(
                    (c.text for c in result.content if hasattr(c, "text")),
                    "Tool execution failed"
                )
                raise RuntimeError(error_text)

            # Extract text content
            text_content = next(
                (c.text for c in result.content if hasattr(c, "text")),
                None
            )

            if text_content:
                return text_content

            import json
            return json.dumps(result.model_dump())

        except Exception as e:
            raise RuntimeError(f"Failed to execute tool '{name}': {str(e)}") from e

    async def disconnect(self) -> None:
        """Disconnect from MCP server. Safe to call multiple times."""
        if not self._initializer.is_initialized:
            return

        try:
            if self._session:
                await self._session.close()
        finally:
            self._session = None
            self._tools = []
            self._initializer.reset()
```

**Note**: The exact MCP Python SDK API may differ. The implementer should consult the `mcp` package documentation at https://pypi.org/project/mcp/ or https://github.com/modelcontextprotocol/python-sdk.

**Reference**: TypeScript `src/shared/mcp-client.ts` (lines 1-221)

**Test file**: Create `tests/test_mcp_client.py` with tests for:
- Constructor validation (empty key, invalid format)
- Deprecation warning for sk_* keys
- No warning for rk_* keys
- Connect and fetch tools
- Not reconnecting if already connected
- Concurrent connect calls safety
- getTools() throwing if not connected
- callTool() throwing if not connected
- callTool() returning result
- disconnect() clearing state
- Safe to call disconnect when not connected
- Reconnection after disconnect
- Account context in headers

---

### 1.4 Create `stripe_agent_toolkit/shared/stripe_client.py`

**Purpose**: Unified client for Stripe operations that wraps MCP client and provides a clean interface for toolkits.

**Implementation Details**:
- Maintains both MCP client (for tool operations) and direct Stripe SDK (for billing/meter events)
- Provides `initialize()`, `get_remote_tools()`, `run()`, and `close()` methods
- Handles context (account, customer, mode)

```python
# File: stripe_agent_toolkit/shared/stripe_client.py

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

    def __init__(self, secret_key: str, context: Optional[Context] = None):
        self._context = context or {}
        self._initializer = AsyncInitializer()

        # Stripe SDK only used for create_meter_event (billing middleware)
        stripe.api_key = secret_key
        stripe.set_app_info(
            MCP_HEADER if self._context.get("mode") == "modelcontextprotocol" else TOOLKIT_HEADER,
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
        return self._initializer.is_initialized

    def get_remote_tools(self) -> List[McpTool]:
        """Get tools from MCP server (after initialization)."""
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "StripeClient not initialized. Call initialize() before accessing tools."
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
        """
        meter_event_data = {
            "event_name": event,
            "payload": {
                "stripe_customer_id": customer,
            },
        }

        if value is not None:
            meter_event_data["payload"]["value"] = value

        if self._context.get("account"):
            meter_event_data["stripe_account"] = self._context["account"]

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
                "StripeClient not initialized. Call initialize() before running tools."
            )
        return await self._mcp_client.call_tool(method, args, customer)

    async def close(self) -> None:
        """Close MCP connection. Safe to call multiple times."""
        if not self._initializer.is_initialized:
            return

        await self._mcp_client.disconnect()
        self._initializer.reset()
```

**Reference**: TypeScript `src/shared/stripe-client.ts` (lines 1-148)

---

### 1.5 Create `stripe_agent_toolkit/shared/schema_utils.py`

**Purpose**: Convert JSON Schema (from MCP tools) to Pydantic models for validation.

**Implementation Details**:
- Create `json_schema_to_pydantic_model()` function that dynamically generates Pydantic models
- Handle common types: string, number, integer, boolean, array, object
- Handle enums, required fields, and descriptions
- Support passthrough for unknown fields

```python
# File: stripe_agent_toolkit/shared/schema_utils.py

from typing import Any, Dict, List, Optional, Type, get_origin
from pydantic import BaseModel, Field, create_model
from pydantic.fields import FieldInfo


def json_schema_to_pydantic_fields(
    schema: Optional[Dict[str, Any]]
) -> Dict[str, tuple]:
    """
    Convert a JSON Schema to Pydantic field definitions.
    Returns dict of {field_name: (type, FieldInfo)}.
    """
    if not schema or schema.get("type") != "object":
        return {}

    properties = schema.get("properties", {})
    required = set(schema.get("required", []))

    fields: Dict[str, tuple] = {}

    for key, prop_schema in properties.items():
        prop = prop_schema if isinstance(prop_schema, dict) else {}

        # Determine Python type
        json_type = prop.get("type", "string")
        enum_values = prop.get("enum")

        if json_type == "string":
            if enum_values:
                from enum import Enum
                # Create enum type dynamically
                enum_class = Enum(f"{key}_enum", {v: v for v in enum_values})
                python_type = enum_class
            else:
                python_type = str
        elif json_type in ("number", "integer"):
            python_type = float if json_type == "number" else int
        elif json_type == "boolean":
            python_type = bool
        elif json_type == "array":
            items = prop.get("items", {})
            item_type = items.get("type", "string")
            if item_type == "string":
                python_type = List[str]
            elif item_type in ("number", "integer"):
                python_type = List[float] if item_type == "number" else List[int]
            else:
                python_type = List[Any]
        elif json_type == "object":
            python_type = Dict[str, Any]
        else:
            python_type = Any

        # Build FieldInfo
        description = prop.get("description")
        is_required = key in required

        if is_required:
            field_info = Field(..., description=description) if description else Field(...)
        else:
            field_info = Field(default=None, description=description) if description else Field(default=None)
            python_type = Optional[python_type]

        fields[key] = (python_type, field_info)

    return fields


def json_schema_to_pydantic_model(
    schema: Optional[Dict[str, Any]],
    model_name: str = "DynamicModel"
) -> Type[BaseModel]:
    """
    Convert a JSON Schema to a Pydantic model class.

    Args:
        schema: JSON Schema dict with 'type', 'properties', 'required'
        model_name: Name for the generated model class

    Returns:
        A Pydantic BaseModel subclass
    """
    fields = json_schema_to_pydantic_fields(schema)

    if not fields:
        # Return an empty model that accepts any fields
        class EmptyModel(BaseModel):
            class Config:
                extra = "allow"
        return EmptyModel

    # Create model dynamically
    model = create_model(
        model_name,
        __config__=type("Config", (), {"extra": "allow"}),
        **fields
    )

    return model
```

**Reference**: TypeScript `src/shared/schema-utils.ts` (lines 1-89)

**Test file**: Create `tests/test_schema_utils.py` with tests for:
- Empty/null schema handling
- String property conversion
- Number/integer property conversion
- Boolean property conversion
- Enum property conversion
- Array properties (string items, number items)
- Required vs optional fields
- Description preservation
- Object properties
- Unknown types
- Validation with created models

---

### 1.6 Update `stripe_agent_toolkit/configuration.py`

**Purpose**: Add `is_tool_allowed_by_name()` function for filtering MCP tools by their snake_case method names.

**Implementation Details**:
- Add tool permission map linking tool names to required permissions
- Implement `is_tool_allowed_by_name()` for filtering remote tools
- Keep existing `is_tool_allowed()` for backwards compatibility

```python
# Add to existing configuration.py

# Map tool names to their required permissions for MCP tools
# SECURITY NOTE: Tools not listed in this map are ALLOWED BY DEFAULT.
# The server-side permissions (via restricted API keys) are the primary security boundary.
TOOL_PERMISSION_MAP: Dict[str, List[Dict[str, str]]] = {
    "create_customer": [{"resource": "customers", "permission": "create"}],
    "list_customers": [{"resource": "customers", "permission": "read"}],
    "create_product": [{"resource": "products", "permission": "create"}],
    "list_products": [{"resource": "products", "permission": "read"}],
    "create_price": [{"resource": "prices", "permission": "create"}],
    "list_prices": [{"resource": "prices", "permission": "read"}],
    "create_payment_link": [{"resource": "payment_links", "permission": "create"}],
    "create_invoice": [{"resource": "invoices", "permission": "create"}],
    "list_invoices": [{"resource": "invoices", "permission": "read"}],
    "finalize_invoice": [{"resource": "invoices", "permission": "update"}],
    "create_invoice_item": [{"resource": "invoice_items", "permission": "create"}],
    "retrieve_balance": [{"resource": "balance", "permission": "read"}],
    "create_refund": [{"resource": "refunds", "permission": "create"}],
    "list_payment_intents": [{"resource": "payment_intents", "permission": "read"}],
    "list_subscriptions": [{"resource": "subscriptions", "permission": "read"}],
    "cancel_subscription": [{"resource": "subscriptions", "permission": "update"}],
    "update_subscription": [{"resource": "subscriptions", "permission": "update"}],
    "search_documentation": [{"resource": "documentation", "permission": "read"}],
    "list_coupons": [{"resource": "coupons", "permission": "read"}],
    "create_coupon": [{"resource": "coupons", "permission": "create"}],
    "list_disputes": [{"resource": "disputes", "permission": "read"}],
    "update_dispute": [{"resource": "disputes", "permission": "update"}],
}


def is_tool_allowed_by_name(tool_name: str, configuration: Configuration) -> bool:
    """
    Check if a tool is allowed by its method name.
    Used for filtering MCP tools that come from the remote server.

    Args:
        tool_name: The tool method name (e.g., 'create_customer')
        configuration: The configuration with actions permissions

    Returns:
        True if the tool is allowed, False otherwise
    """
    # If no actions are configured, all tools are allowed
    if not configuration.get("actions"):
        return True

    permissions = TOOL_PERMISSION_MAP.get(tool_name)

    # Unknown tools are allowed by default (MCP server may have new tools)
    if not permissions:
        return True

    actions = configuration["actions"]
    return all(
        actions.get(p["resource"], {}).get(p["permission"], False)
        for p in permissions
    )
```

**Reference**: TypeScript `src/shared/configuration.ts` (lines 71-141)

---

### 1.7 Create `stripe_agent_toolkit/shared/toolkit_core.py`

**Purpose**: Base class for all framework-specific toolkit implementations.

**Implementation Details**:
- Generic base class with type parameter for tool type
- Handles initialization, tool filtering, and cleanup
- Subclasses override `_convert_tools()` method

```python
# File: stripe_agent_toolkit/shared/toolkit_core.py

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
    Subclasses override _convert_tools() to transform MCP tools into framework-specific formats.
    """

    def __init__(self, secret_key: str, configuration: Optional[Configuration] = None):
        self._configuration = configuration or {}
        self._stripe = StripeClient(
            secret_key,
            self._configuration.get("context")
        )
        self._initializer = AsyncInitializer()
        self._tools: T = self._empty_tools()

    @abstractmethod
    def _empty_tools(self) -> T:
        """Return the empty value for tools (e.g., [], {})."""
        pass

    @abstractmethod
    def _convert_tools(self, mcp_tools: List[McpTool]) -> T:
        """Convert MCP tools to framework-specific format."""
        pass

    async def initialize(self) -> None:
        """Initialize the toolkit by connecting to MCP server and fetching tools."""
        await self._initializer.initialize(self._do_initialize)

    async def _do_initialize(self) -> None:
        await self._stripe.initialize()

        remote_tools = self._stripe.get_remote_tools()
        filtered_tools = [
            t for t in remote_tools
            if is_tool_allowed_by_name(t["name"], self._configuration)
        ]

        self._tools = self._convert_tools(filtered_tools)

    @property
    def is_initialized(self) -> bool:
        return self._initializer.is_initialized

    def get_tools(self) -> T:
        """Get tools, throwing if not initialized."""
        self._ensure_initialized()
        return self._tools

    def _get_tools_with_warning(self) -> T:
        """Get tools with a warning if not initialized. Used for deprecated property access."""
        self._warn_if_not_initialized()
        return self._tools

    async def close(self) -> None:
        """Close the MCP connection and clean up resources."""
        if not self._initializer.is_initialized:
            return

        await self._stripe.close()
        self._initializer.reset()
        self._tools = self._empty_tools()

    def _ensure_initialized(self) -> None:
        """Throw an error if not initialized."""
        if not self._initializer.is_initialized:
            raise RuntimeError(
                "StripeAgentToolkit not initialized. Call await toolkit.initialize() first."
            )

    def _warn_if_not_initialized(self) -> None:
        """Warn if accessing tools before initialization."""
        if not self._initializer.is_initialized:
            warnings.warn(
                "[StripeAgentToolkit] Accessing tools before initialization. "
                "Call await toolkit.initialize() first, or use create_stripe_agent_toolkit() factory. "
                "Tools will be empty until initialized."
            )

    @property
    def stripe(self) -> StripeClient:
        """Access to the underlying StripeClient."""
        return self._stripe
```

**Reference**: TypeScript `src/shared/toolkit-core.ts` (lines 1-124)

---

## Phase 2: Migrate Framework Implementations

### 2.1 Migrate `stripe_agent_toolkit/openai/toolkit.py`

**Changes**:
- Extend `ToolkitCore` instead of managing tools directly
- Implement `_convert_tools()` to create `FunctionTool` instances from MCP tools
- Add factory function `create_stripe_agent_toolkit()`
- Keep `billing_hook()` method (uses direct Stripe SDK)
- Deprecate synchronous tool access via property

```python
# File: stripe_agent_toolkit/openai/toolkit.py

import json
from typing import List, Optional, Dict

from agents import FunctionTool
from agents.run_context import RunContextWrapper

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..configuration import Configuration
from .hooks import BillingHooks


class StripeAgentToolkit(ToolkitCore[List[FunctionTool]]):
    """Stripe Agent Toolkit for OpenAI Agents SDK."""

    def __init__(self, secret_key: str, configuration: Optional[Configuration] = None):
        super().__init__(secret_key, configuration)

    def _empty_tools(self) -> List[FunctionTool]:
        return []

    def _convert_tools(self, mcp_tools: List[McpTool]) -> List[FunctionTool]:
        tools = []
        for mcp_tool in mcp_tools:
            tools.append(self._create_function_tool(mcp_tool))
        return tools

    def _create_function_tool(self, mcp_tool: McpTool) -> FunctionTool:
        stripe_client = self._stripe
        tool_name = mcp_tool["name"]

        async def on_invoke_tool(ctx: RunContextWrapper, input_str: str) -> str:
            args = json.loads(input_str)
            return await stripe_client.run(tool_name, args)

        # Prepare parameters schema
        parameters = dict(mcp_tool.get("inputSchema", {}))
        parameters["additionalProperties"] = False
        parameters["type"] = "object"

        # Clean up schema
        for key in ["description", "title"]:
            parameters.pop(key, None)

        if "properties" in parameters:
            for prop in parameters["properties"].values():
                for key in ["title", "default"]:
                    prop.pop(key, None)

        return FunctionTool(
            name=tool_name,
            description=mcp_tool.get("description", tool_name),
            params_json_schema=parameters,
            on_invoke_tool=on_invoke_tool,
            strict_json_schema=False
        )

    @property
    def tools(self) -> List[FunctionTool]:
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
        """Create a billing hook for usage metering."""
        return BillingHooks(self._stripe, type, customer, meter, meters)


async def create_stripe_agent_toolkit(
    secret_key: str,
    configuration: Optional[Configuration] = None
) -> StripeAgentToolkit:
    """
    Factory function to create and initialize a StripeAgentToolkit.

    Example:
        toolkit = await create_stripe_agent_toolkit(
            secret_key='rk_test_...',
            configuration={'actions': {'customers': {'create': True}}}
        )
        tools = toolkit.get_tools()
        await toolkit.close()
    """
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit
```

**Reference**: TypeScript `src/openai/toolkit.ts` (lines 1-69)

---

### 2.2 Migrate `stripe_agent_toolkit/langchain/toolkit.py`

**Changes**:
- Extend `ToolkitCore` instead of managing tools directly
- Implement `_convert_tools()` to create `StripeTool` (BaseTool) instances
- Add factory function `create_stripe_agent_toolkit()`
- Update `StripeTool` class to use async MCP execution

```python
# File: stripe_agent_toolkit/langchain/toolkit.py

from typing import List, Optional, Any, Type
from pydantic import BaseModel
from langchain.tools import BaseTool

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..shared.schema_utils import json_schema_to_pydantic_model
from ..shared.stripe_client import StripeClient
from ..configuration import Configuration


class StripeTool(BaseTool):
    """Tool for interacting with Stripe via MCP."""

    stripe_client: StripeClient
    method: str
    name: str = ""
    description: str = ""
    args_schema: Optional[Type[BaseModel]] = None

    def _run(self, **kwargs: Any) -> str:
        """Synchronous execution - wraps async call."""
        import asyncio
        return asyncio.get_event_loop().run_until_complete(
            self.stripe_client.run(self.method, kwargs)
        )

    async def _arun(self, **kwargs: Any) -> str:
        """Async execution via MCP."""
        return await self.stripe_client.run(self.method, kwargs)


class StripeAgentToolkit(ToolkitCore[List[StripeTool]]):
    """Stripe Agent Toolkit for LangChain."""

    def __init__(self, secret_key: str, configuration: Optional[Configuration] = None):
        super().__init__(secret_key, configuration)

    def _empty_tools(self) -> List[StripeTool]:
        return []

    def _convert_tools(self, mcp_tools: List[McpTool]) -> List[StripeTool]:
        tools = []
        for mcp_tool in mcp_tools:
            # Convert JSON Schema to Pydantic model
            args_schema = json_schema_to_pydantic_model(
                mcp_tool.get("inputSchema"),
                model_name=f"{mcp_tool['name']}_args"
            )

            tools.append(StripeTool(
                stripe_client=self._stripe,
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
    """
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit
```

**Reference**: TypeScript `src/langchain/toolkit.ts` (lines 1-88)

---

### 2.3 Migrate `stripe_agent_toolkit/crewai/toolkit.py`

**Changes**:
- Same pattern as LangChain (CrewAI uses LangChain tools)
- Extend `ToolkitCore`
- Add factory function

```python
# File: stripe_agent_toolkit/crewai/toolkit.py

from typing import List, Optional, Any, Type
from pydantic import BaseModel
from crewai.tools import BaseTool  # Or import from langchain if crewai doesn't have its own

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..shared.schema_utils import json_schema_to_pydantic_model
from ..shared.stripe_client import StripeClient
from ..configuration import Configuration


class StripeTool(BaseTool):
    """Tool for interacting with Stripe via MCP."""

    stripe_client: StripeClient
    method: str
    name: str = ""
    description: str = ""
    args_schema: Optional[Type[BaseModel]] = None

    def _run(self, **kwargs: Any) -> str:
        """Synchronous execution - wraps async call."""
        import asyncio
        return asyncio.get_event_loop().run_until_complete(
            self.stripe_client.run(self.method, kwargs)
        )

    async def _arun(self, **kwargs: Any) -> str:
        """Async execution via MCP."""
        return await self.stripe_client.run(self.method, kwargs)


class StripeAgentToolkit(ToolkitCore[List[StripeTool]]):
    """Stripe Agent Toolkit for CrewAI."""

    def __init__(self, secret_key: str, configuration: Optional[Configuration] = None):
        super().__init__(secret_key, configuration)

    def _empty_tools(self) -> List[StripeTool]:
        return []

    def _convert_tools(self, mcp_tools: List[McpTool]) -> List[StripeTool]:
        tools = []
        for mcp_tool in mcp_tools:
            args_schema = json_schema_to_pydantic_model(
                mcp_tool.get("inputSchema"),
                model_name=f"{mcp_tool['name']}_args"
            )

            tools.append(StripeTool(
                stripe_client=self._stripe,
                method=mcp_tool["name"],
                name=mcp_tool["name"],
                description=mcp_tool.get("description", mcp_tool["name"]),
                args_schema=args_schema,
            ))
        return tools

    @property
    def tools(self) -> List[StripeTool]:
        """Deprecated: Use get_tools() instead."""
        return self._get_tools_with_warning()


async def create_stripe_agent_toolkit(
    secret_key: str,
    configuration: Optional[Configuration] = None
) -> StripeAgentToolkit:
    """Factory function to create and initialize a StripeAgentToolkit."""
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit
```

---

### 2.4 Migrate `stripe_agent_toolkit/strands/toolkit.py`

**Changes**:
- Same pattern as OpenAI (Strands uses similar tool structure)
- Extend `ToolkitCore`
- Update `StripeTool` to use async MCP
- Keep `billing_hook()` method

```python
# File: stripe_agent_toolkit/strands/toolkit.py

import json
from typing import List, Optional, Dict

from strands.tools.tools import PythonAgentTool as StrandTool

from ..shared.toolkit_core import ToolkitCore
from ..shared.mcp_client import McpTool
from ..configuration import Configuration
from .hooks import BillingHooks


def create_strand_tool(stripe_client, mcp_tool: McpTool) -> StrandTool:
    """Create a Strand tool from MCP tool definition."""
    tool_name = mcp_tool["name"]

    async def execute(**kwargs) -> str:
        return await stripe_client.run(tool_name, kwargs)

    # Prepare parameters schema
    parameters = dict(mcp_tool.get("inputSchema", {}))
    parameters["additionalProperties"] = False
    parameters["type"] = "object"

    for key in ["description", "title"]:
        parameters.pop(key, None)

    if "properties" in parameters:
        for prop in parameters["properties"].values():
            for key in ["title", "default"]:
                prop.pop(key, None)

    return StrandTool(
        name=tool_name,
        description=mcp_tool.get("description", tool_name),
        params_json_schema=parameters,
        execute=execute,
    )


class StripeAgentToolkit(ToolkitCore[List[StrandTool]]):
    """Stripe Agent Toolkit for Strands."""

    def __init__(self, secret_key: str, configuration: Optional[Configuration] = None):
        super().__init__(secret_key, configuration)

    def _empty_tools(self) -> List[StrandTool]:
        return []

    def _convert_tools(self, mcp_tools: List[McpTool]) -> List[StrandTool]:
        return [create_strand_tool(self._stripe, t) for t in mcp_tools]

    @property
    def tools(self) -> List[StrandTool]:
        """Deprecated: Use get_tools() instead."""
        return self._get_tools_with_warning()

    def billing_hook(
        self,
        type: Optional[str] = None,
        customer: Optional[str] = None,
        meter: Optional[str] = None,
        meters: Optional[Dict[str, str]] = None
    ) -> BillingHooks:
        """Create a billing hook for usage metering."""
        return BillingHooks(self._stripe, type, customer, meter, meters)


async def create_stripe_agent_toolkit(
    secret_key: str,
    configuration: Optional[Configuration] = None
) -> StripeAgentToolkit:
    """Factory function to create and initialize a StripeAgentToolkit."""
    toolkit = StripeAgentToolkit(secret_key, configuration)
    await toolkit.initialize()
    return toolkit
```

---

## Phase 3: Files to Delete or Deprecate

### 3.1 Files to Delete

These files contain direct Stripe SDK implementations that will be replaced by MCP:

- `stripe_agent_toolkit/api.py` - Replace with `shared/stripe_client.py`
- `stripe_agent_toolkit/functions.py` - No longer needed (MCP handles execution)
- `stripe_agent_toolkit/schema.py` - No longer needed (schemas come from MCP)
- `stripe_agent_toolkit/prompts.py` - No longer needed (descriptions come from MCP)
- `stripe_agent_toolkit/tools.py` - No longer needed (tools come from MCP)
- `stripe_agent_toolkit/openai/tool.py` - Merged into toolkit.py
- `stripe_agent_toolkit/langchain/tool.py` - Merged into toolkit.py
- `stripe_agent_toolkit/crewai/tool.py` - Merged into toolkit.py
- `stripe_agent_toolkit/strands/tool.py` - Merged into toolkit.py

### 3.2 Tests to Update

- `tests/test_functions.py` - Delete (functions no longer exist)
- `tests/test_configuration.py` - Update to test `is_tool_allowed_by_name()`

---

## Phase 4: Update Dependencies

### 4.1 Update `pyproject.toml` or `setup.py`

Add new dependencies:
```toml
[project.dependencies]
mcp = ">=1.0.0"  # MCP Python SDK
stripe = ">=6.0.0"
pydantic = ">=2.0.0"

# Optional dependencies for frameworks
[project.optional-dependencies]
langchain = ["langchain>=0.1.0"]
crewai = ["crewai>=0.1.0"]
openai = ["openai>=1.0.0", "agents>=0.0.84"]
strands = ["strands>=0.1.0"]
```

### 4.2 Bump Version

Update version to `0.7.0` to indicate MCP migration.

---

## Phase 5: Update Examples

### 5.1 Update All Examples

Each example needs to be updated to use async initialization:

**Before**:
```python
from stripe_agent_toolkit.openai.toolkit import StripeAgentToolkit

toolkit = StripeAgentToolkit(
    secret_key=os.environ["STRIPE_SECRET_KEY"],
    configuration={"actions": {"customers": {"create": True}}}
)
tools = toolkit.get_tools()
```

**After**:
```python
import asyncio
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit

async def main():
    toolkit = await create_stripe_agent_toolkit(
        secret_key=os.environ["STRIPE_SECRET_KEY"],
        configuration={"actions": {"customers": {"create": True}}}
    )
    tools = toolkit.get_tools()

    # ... use tools ...

    await toolkit.close()

asyncio.run(main())
```

### 5.2 Examples to Update

- `examples/openai/customer_support/main.py`
- `examples/openai/file_search/main.py`
- `examples/openai/web_search/main.py`
- `examples/langchain/main.py`
- `examples/crewai/main.py`
- `examples/strands/main.py`

---

## Phase 6: Create MIGRATION.md for Python

Create a migration guide similar to TypeScript:

```markdown
# Migration Guide: API to MCP Architecture (Python)

## Breaking Changes

### 1. Async Initialization Required

Toolkit initialization now connects to `mcp.stripe.com` and must be awaited.

```python
# Before (v0.6.x)
toolkit = StripeAgentToolkit(secret_key=key, configuration=config)
tools = toolkit.get_tools()

# After (v0.7.0+)
toolkit = await create_stripe_agent_toolkit(secret_key=key, configuration=config)
tools = toolkit.get_tools()
await toolkit.close()  # Clean up when done
```

### 2. MCP Connection Required

Tools are fetched from `mcp.stripe.com`. Ensure network access to HTTPS port 443.

### 3. Tool Names Changed to snake_case

Tools now use consistent snake_case naming from the MCP server.

### 4. `mcp` Package Now Required

Install with: `pip install stripe-agent-toolkit[mcp]`

## Migration Checklist

- [ ] Use `create_stripe_agent_toolkit()` factory function with `await`
- [ ] Add error handling for MCP connection failures
- [ ] Ensure `mcp.stripe.com` is accessible
- [ ] Add `await toolkit.close()` for cleanup
- [ ] Consider switching to restricted keys (`rk_*`)
```

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests

Create/update these test files:

1. `tests/test_async_initializer.py` - Test async initialization utility
2. `tests/test_mcp_client.py` - Test MCP client (with mocking)
3. `tests/test_stripe_client.py` - Test unified client
4. `tests/test_schema_utils.py` - Test JSON Schema to Pydantic conversion
5. `tests/test_configuration.py` - Update for `is_tool_allowed_by_name()`
6. `tests/test_toolkit_core.py` - Test base toolkit class

### 7.2 Mock Strategy

Use `unittest.mock` to mock MCP SDK:

```python
from unittest import mock

@mock.patch("mcp.ClientSession")
@mock.patch("mcp.client.streamable_http.streamablehttp_client")
async def test_connect(mock_transport, mock_session):
    mock_session_instance = mock.AsyncMock()
    mock_session_instance.list_tools.return_value = MockListToolsResult(
        tools=[
            MockTool(name="create_customer", description="Create a customer"),
        ]
    )
    mock_session.return_value.__aenter__.return_value = mock_session_instance

    client = StripeMcpClient({"secret_key": "rk_test_123"})
    await client.connect()

    assert client.is_connected
    tools = client.get_tools()
    assert len(tools) == 1
```

---

## Phase 8: Implementation Order

### Step-by-Step Execution

1. **Create branch**: `git checkout -b python-mcp-migration`

2. **Phase 1 - Shared Infrastructure** (Day 1-2):
   - Create `shared/` directory
   - Implement `constants.py`
   - Implement `async_initializer.py` + tests
   - Implement `schema_utils.py` + tests
   - Update `configuration.py` with `is_tool_allowed_by_name()`

3. **Phase 1 continued - MCP Client** (Day 2-3):
   - Implement `mcp_client.py` + tests
   - Implement `stripe_client.py`
   - Implement `toolkit_core.py`

4. **Phase 2 - Framework Migrations** (Day 3-4):
   - Migrate `openai/toolkit.py`
   - Migrate `langchain/toolkit.py`
   - Migrate `crewai/toolkit.py`
   - Migrate `strands/toolkit.py`

5. **Phase 3 - Cleanup** (Day 4):
   - Delete deprecated files
   - Update tests

6. **Phase 4-5 - Dependencies & Examples** (Day 5):
   - Update `pyproject.toml`
   - Update all examples
   - Create `MIGRATION.md`

7. **Phase 6 - Testing & Review** (Day 5-6):
   - Run all tests
   - Manual testing with live MCP server
   - Code review

---

## Summary of New File Structure

```
stripe_agent_toolkit/
├── __init__.py
├── configuration.py          # Updated with is_tool_allowed_by_name()
├── shared/
│   ├── __init__.py
│   ├── constants.py          # NEW
│   ├── async_initializer.py  # NEW
│   ├── mcp_client.py         # NEW
│   ├── stripe_client.py      # NEW (replaces api.py)
│   ├── toolkit_core.py       # NEW
│   └── schema_utils.py       # NEW
├── openai/
│   ├── __init__.py
│   ├── toolkit.py            # UPDATED (extends ToolkitCore)
│   └── hooks.py              # Unchanged
├── langchain/
│   ├── __init__.py
│   └── toolkit.py            # UPDATED (extends ToolkitCore)
├── crewai/
│   ├── __init__.py
│   └── toolkit.py            # UPDATED (extends ToolkitCore)
└── strands/
    ├── __init__.py
    ├── toolkit.py            # UPDATED (extends ToolkitCore)
    └── hooks.py              # Unchanged

# DELETED FILES:
# - api.py
# - functions.py
# - schema.py
# - prompts.py
# - tools.py
# - */tool.py (in each framework dir)

tests/
├── __init__.py
├── test_async_initializer.py # NEW
├── test_mcp_client.py        # NEW
├── test_stripe_client.py     # NEW
├── test_schema_utils.py      # NEW
├── test_configuration.py     # UPDATED
└── test_toolkit_core.py      # NEW

# DELETED TEST FILES:
# - test_functions.py
```

---

## Key Differences from TypeScript Implementation

1. **Async Pattern**: Python uses `async`/`await` natively with `asyncio`, while TypeScript uses Promises
2. **Type System**: Python uses Pydantic for runtime validation instead of Zod
3. **MCP SDK**: Python MCP SDK may have slightly different API than TypeScript version
4. **Event Loop**: Python requires explicit event loop management in some contexts
5. **Framework APIs**: Each Python framework (LangChain, CrewAI, etc.) has its own tool patterns

---

## Verification Checklist

Before considering the migration complete:

- [ ] All unit tests pass
- [ ] Can connect to `mcp.stripe.com` and fetch tools
- [ ] Tool filtering by configuration works
- [ ] Each framework toolkit creates correct tool types
- [ ] Factory functions work correctly
- [ ] `close()` properly cleans up resources
- [ ] Deprecation warnings appear for old patterns
- [ ] Examples work end-to-end
- [ ] Documentation is updated
- [ ] Version is bumped to 0.7.0

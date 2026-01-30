from typing import Dict, List, Literal, Optional
from typing_extensions import TypedDict

# Define Object type
Object = Literal[
    "customers",
    "invoices",
    "invoiceItems",
    "paymentLinks",
    "products",
    "prices",
    "balance",
    "refunds",
    "paymentIntents",
]


# Define Permission type
class Permission(TypedDict, total=False):
    create: Optional[bool]
    update: Optional[bool]
    read: Optional[bool]


# Define BalancePermission type
class BalancePermission(TypedDict, total=False):
    read: Optional[bool]


# Define Actions type
class Actions(TypedDict, total=False):
    customers: Optional[Permission]
    invoices: Optional[Permission]
    invoice_items: Optional[Permission]
    payment_links: Optional[Permission]
    products: Optional[Permission]
    prices: Optional[Permission]
    balance: Optional[BalancePermission]
    refunds: Optional[Permission]
    payment_intents: Optional[Permission]
    billing_portal_sessions: Optional[Permission]


# Define Context type
class Context(TypedDict, total=False):
    account: Optional[str]


# Define Configuration type
class Configuration(TypedDict, total=False):
    actions: Optional[Actions]
    context: Optional[Context]


def is_tool_allowed(tool, configuration):
    """
    Check if a tool is allowed based on its actions dict and configuration.
    Used for filtering local tools defined in tools.py.

    Args:
        tool: Tool dict with 'actions' key mapping resources to permissions
        configuration: Configuration with 'actions' permissions

    Returns:
        True if the tool is allowed, False otherwise
    """
    for resource, permissions in tool.get("actions", {}).items():
        if resource not in configuration.get("actions", {}):
            return False
        for permission in permissions:
            if (
                not configuration["actions"]
                .get(resource, {})
                .get(permission, False)
            ):
                return False
    return True


# Map tool names to their required permissions for MCP tools
# SECURITY NOTE: Tools not listed in this map are ALLOWED BY DEFAULT.
# The server-side permissions (via restricted API keys) are the primary
# security boundary.
TOOL_PERMISSION_MAP: Dict[str, List[Dict[str, str]]] = {
    "create_customer": [{"resource": "customers", "permission": "create"}],
    "list_customers": [{"resource": "customers", "permission": "read"}],
    "create_product": [{"resource": "products", "permission": "create"}],
    "list_products": [{"resource": "products", "permission": "read"}],
    "create_price": [{"resource": "prices", "permission": "create"}],
    "list_prices": [{"resource": "prices", "permission": "read"}],
    "create_payment_link": [
        {"resource": "payment_links", "permission": "create"}
    ],
    "create_invoice": [{"resource": "invoices", "permission": "create"}],
    "list_invoices": [{"resource": "invoices", "permission": "read"}],
    "finalize_invoice": [{"resource": "invoices", "permission": "update"}],
    "create_invoice_item": [
        {"resource": "invoice_items", "permission": "create"}
    ],
    "retrieve_balance": [{"resource": "balance", "permission": "read"}],
    "create_refund": [{"resource": "refunds", "permission": "create"}],
    "list_payment_intents": [
        {"resource": "payment_intents", "permission": "read"}
    ],
    "list_subscriptions": [
        {"resource": "subscriptions", "permission": "read"}
    ],
    "cancel_subscription": [
        {"resource": "subscriptions", "permission": "update"}
    ],
    "update_subscription": [
        {"resource": "subscriptions", "permission": "update"}
    ],
    "search_documentation": [
        {"resource": "documentation", "permission": "read"}
    ],
    "list_coupons": [{"resource": "coupons", "permission": "read"}],
    "create_coupon": [{"resource": "coupons", "permission": "create"}],
    "list_disputes": [{"resource": "disputes", "permission": "read"}],
    "update_dispute": [{"resource": "disputes", "permission": "update"}],
    "create_billing_portal_session": [
        {"resource": "billing_portal_sessions", "permission": "create"}
    ],
}


def is_tool_allowed_by_name(
    tool_name: str, configuration: Optional[Configuration]
) -> bool:
    """
    Check if a tool is allowed by its method name.
    Used for filtering MCP tools that come from the remote server.

    Args:
        tool_name: The tool method name (e.g., 'create_customer')
        configuration: The configuration with actions permissions

    Returns:
        True if the tool is allowed, False otherwise
    """
    # If no configuration or no actions are configured, all tools are allowed
    if not configuration or not configuration.get("actions"):
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

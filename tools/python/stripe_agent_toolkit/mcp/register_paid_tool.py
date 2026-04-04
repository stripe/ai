"""Register a paid MCP tool with Stripe Checkout gating."""

from __future__ import annotations

import inspect
import json
from typing import Any, Callable, Optional
from typing_extensions import TypedDict

try:
    import stripe
except ImportError:  # pragma: no cover - exercised via runtime use
    stripe = None  # type: ignore[assignment]


class PaidToolOptions(TypedDict):
    """Options for registering a paid MCP tool."""

    payment_reason: str
    meter_event: Optional[str]
    stripe_secret_key: str
    user_email: str
    checkout: dict[str, Any]


async def _maybe_await(value: Any) -> Any:
    """Await the value when it is awaitable (helps with async mocks)."""
    if inspect.isawaitable(value):
        return await value
    return value


def _as_list(data: Any) -> list[Any]:
    """Extract API list payload from Stripe responses."""
    if isinstance(data, dict):
        maybe_data = data.get("data")
        if isinstance(maybe_data, list):
            return maybe_data
        return []

    maybe_data = getattr(data, "data", None)
    if isinstance(maybe_data, list):
        return maybe_data
    return []


def _extract_error_message(error: Exception) -> str:
    """Extract an actionable error message from Stripe exceptions."""
    raw = getattr(error, "raw", None)
    if isinstance(raw, dict) and isinstance(raw.get("message"), str):
        return raw["message"]
    message = getattr(error, "message", None)
    if isinstance(message, str):
        return message
    return str(error) or "Unknown error"


def _make_result(
    payload: dict[str, Any],
    *,
    is_error: bool = False,
) -> dict[str, Any]:
    """Format return payload for MCP tool responses."""
    result: dict[str, Any] = {
        "content": [
            {
                "type": "text",
                "text": json.dumps(payload),
            }
        ]
    }
    if is_error:
        result["isError"] = True
    return result


async def register_paid_tool(
    mcp_server: Any,
    tool_name: str,
    tool_description: str,
    params_schema: Any,
    callback: Callable[..., Any],
    options: PaidToolOptions,
) -> None:
    """Register a paid tool that enforces Stripe payment before execution."""
    line_items = options["checkout"].get("line_items")
    price_id: Optional[str] = None
    if isinstance(line_items, list):
        for item in line_items:
            if isinstance(item, dict):
                maybe_price = item.get("price")
                if isinstance(maybe_price, str):
                    price_id = maybe_price
                    break

    if not price_id:
        raise ValueError(
            "Price ID is required for a paid MCP tool. Learn more about "
            "prices: https://docs.stripe.com/products-prices/"
            "how-products-and-prices-work"
        )

    if stripe is None:
        raise ImportError(
            "The Stripe SDK is required. Install with "
            "`stripe-agent-toolkit[mcp-payments]`."
        )

    app_info = {
        "name": "stripe-agent-toolkit-mcp-payments",
        "version": "0.7.0",
        "url": "https://github.com/stripe/ai",
    }

    if hasattr(stripe, "StripeClient"):
        stripe_client = stripe.StripeClient(
            options["stripe_secret_key"],
            app_info=app_info,
        )
    else:
        stripe.api_key = options["stripe_secret_key"]
        if hasattr(stripe, "set_app_info"):
            stripe.set_app_info(
                app_info["name"],
                app_info["version"],
                app_info["url"],
            )
        stripe_client = stripe

    async def get_or_create_customer(email: str) -> str:
        customers = await _maybe_await(
            stripe_client.customers.list({"email": email})
        )
        customer_id: Optional[str] = None
        for customer in _as_list(customers):
            customer_email = (
                customer.get("email")
                if isinstance(customer, dict)
                else getattr(customer, "email", None)
            )
            if customer_email == email:
                customer_id = (
                    customer.get("id")
                    if isinstance(customer, dict)
                    else getattr(customer, "id", None)
                )
                break

        if not customer_id:
            customer = await _maybe_await(
                stripe_client.customers.create({"email": email})
            )
            if isinstance(customer, dict):
                customer_id = customer.get("id")
            else:
                customer_id = getattr(customer, "id", None)

        if not isinstance(customer_id, str) or not customer_id:
            raise RuntimeError("Failed to resolve Stripe customer ID")
        return customer_id

    async def is_tool_paid_for(name: str, customer_id: str) -> bool:
        sessions = await _maybe_await(
            stripe_client.checkout.sessions.list(
                {"customer": customer_id, "limit": 100}
            )
        )
        paid_session: Optional[Any] = None
        for session in _as_list(sessions):
            metadata = (
                session.get("metadata")
                if isinstance(session, dict)
                else getattr(session, "metadata", None)
            ) or {}
            tool_name_meta = (
                metadata.get("toolName")
                if isinstance(metadata, dict)
                else getattr(metadata, "toolName", None)
            )
            payment_status = (
                session.get("payment_status")
                if isinstance(session, dict)
                else getattr(session, "payment_status", None)
            )
            if tool_name_meta == name and payment_status == "paid":
                paid_session = session
                break

        if paid_session is None:
            return False

        subscription = (
            paid_session.get("subscription")
            if isinstance(paid_session, dict)
            else getattr(paid_session, "subscription", None)
        )
        if subscription:
            subs = await _maybe_await(
                stripe_client.subscriptions.list(
                    {"customer": customer_id, "status": "active"}
                )
            )
            for sub in _as_list(subs):
                items = (
                    sub.get("items")
                    if isinstance(sub, dict)
                    else getattr(sub, "items", None)
                )
                item_data = (
                    items.get("data")
                    if isinstance(items, dict)
                    else getattr(items, "data", None)
                )
                if not isinstance(item_data, list):
                    continue
                for item in item_data:
                    price = (
                        item.get("price")
                        if isinstance(item, dict)
                        else getattr(item, "price", None)
                    )
                    item_price_id = (
                        price.get("id")
                        if isinstance(price, dict)
                        else getattr(price, "id", None)
                    )
                    if item_price_id == price_id:
                        return True
            return False

        return True

    async def create_checkout_session(
        payment_type: str,
        customer_id: str,
    ) -> dict[str, Any]:
        try:
            checkout = dict(options["checkout"])
            metadata = dict(checkout.get("metadata") or {})
            metadata["toolName"] = tool_name
            checkout["metadata"] = metadata
            checkout["customer"] = customer_id or None

            session = await _maybe_await(
                stripe_client.checkout.sessions.create(checkout)
            )
            checkout_url = (
                session.get("url")
                if isinstance(session, dict)
                else getattr(session, "url", None)
            )
            return _make_result(
                {
                    "status": "payment_required",
                    "data": {
                        "paymentType": payment_type,
                        "checkoutUrl": checkout_url,
                        "paymentReason": options["payment_reason"],
                    },
                }
            )
        except Exception as error:
            message = _extract_error_message(error)
            return _make_result(
                {
                    "status": "error",
                    "error": message,
                },
                is_error=True,
            )

    async def record_usage(customer_id: str) -> None:
        meter_event = options.get("meter_event")
        if not meter_event:
            return
        await _maybe_await(
            stripe_client.billing.meter_events.create(
                {
                    "event_name": meter_event,
                    "payload": {
                        "stripe_customer_id": customer_id,
                        "value": "1",
                    },
                }
            )
        )

    async def wrapped_callback(*args: Any, **kwargs: Any) -> dict[str, Any]:
        try:
            customer_id = await get_or_create_customer(options["user_email"])
            paid_for_tool = await is_tool_paid_for(tool_name, customer_id)
            payment_type = (
                "usageBased"
                if options.get("meter_event")
                else "oneTimeSubscription"
            )
            if not paid_for_tool:
                return await create_checkout_session(payment_type, customer_id)

            if payment_type == "usageBased":
                await record_usage(customer_id)

            callback_result = callback(*args, **kwargs)
            return await _maybe_await(callback_result)
        except Exception as error:
            message = _extract_error_message(error)
            return _make_result(
                {
                    "status": "error",
                    "error": message,
                },
                is_error=True,
            )

    mcp_server.tool(tool_name, tool_description, params_schema)(
        wrapped_callback
    )

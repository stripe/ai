"""
Idempotency guard for Stripe agent tool calls.

Fixes Issue #402: Agent-level retry creates duplicate charges — no idempotency
guard above the tool layer.

The Stripe SDK handles network-level retries within a single session using
auto-generated idempotency keys. However, when an agent framework retries a
tool call as a *new* invocation (e.g. after a timeout, crash, or model loop),
a fresh session starts with a new key, and a second charge is created.

This module solves the problem at the orchestration layer by:
  1. Deriving a *stable* request_id from a deterministic hash of
     (tool_name, sorted_args) before the call is made.
  2. Forwarding that key as the ``idempotency_key`` on every mutating Stripe
     call so that Stripe itself deduplicates the request for up to 24 hours.

Only mutating operations (those that can cause side-effects like charges)
receive idempotency keys. Read-only operations (list, retrieve) are excluded
because Stripe rejects idempotency keys on GET requests.

Usage
-----
    from stripe_agent_toolkit.idempotency import idempotency_key_for

    key = idempotency_key_for("create_payment_intent", {"amount": 1000, "currency": "usd"})
    # key is stable: same inputs always produce the same key
    stripe.PaymentIntent.create(amount=1000, currency="usd", idempotency_key=key)
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

# Tools that create or mutate financial objects.  Only these should receive
# a stable idempotency key; read (list/retrieve) operations must not.
MUTATING_TOOLS: frozenset[str] = frozenset(
    {
        "create_customer",
        "create_product",
        "create_price",
        "create_payment_link",
        "create_payment_intent",
        "create_refund",
        "create_invoice",
        "create_invoice_item",
        "finalize_invoice",
        "create_subscription",
        "cancel_subscription",
        "update_subscription",
        "create_coupon",
    }
)


def _stable_json(obj: Any) -> str:
    """Serialize *obj* to JSON with sorted keys so that dict ordering does not
    affect the resulting hash."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), default=str)


def idempotency_key_for(tool_name: str, args: dict[str, Any]) -> str | None:
    """Return a deterministic idempotency key for *tool_name* called with *args*.

    Returns ``None`` for read-only tools so callers can use the result as a
    guard directly::

        key = idempotency_key_for(tool_name, args)
        stripe_call(..., **({"idempotency_key": key} if key else {}))

    The key is a 64-character hex SHA-256 digest of ``"<tool_name>:<stable_json(args)>"``,
    which is unique per (tool, args) combination and stable across retries.
    """
    if tool_name not in MUTATING_TOOLS:
        return None

    payload = f"{tool_name}:{_stable_json(args)}"
    return hashlib.sha256(payload.encode()).hexdigest()


def with_idempotency(tool_name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of *args* with ``idempotency_key`` injected if appropriate.

    Safe to call for every tool — read-only tools are returned unchanged.

    Example
    -------
    >>> params = with_idempotency("create_payment_intent", {"amount": 500, "currency": "usd"})
    >>> "idempotency_key" in params
    True
    >>> params = with_idempotency("list_customers", {"limit": 10})
    >>> "idempotency_key" in params
    False
    """
    key = idempotency_key_for(tool_name, args)
    if key is None:
        return dict(args)
    return {**args, "idempotency_key": key}
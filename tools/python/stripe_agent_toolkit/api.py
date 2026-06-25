"""
stripe_agent_toolkit/api.py
---------------------------
Thin wrappers around stripe-python that agent tools call directly.

Changes in this version
~~~~~~~~~~~~~~~~~~~~~~~
* Fix #402 — Every mutating call now passes a *stable* idempotency_key
  derived from the tool name + arguments, preventing duplicate charges
  when an agent framework retries a tool invocation as a new session.

* Fix #388 — ``list_subscriptions``, ``list_products``, ``list_prices``,
  and ``search_stripe_resources`` now accept optional ``starting_after``
  and ``ending_before`` cursor parameters so callers can page through more
  than 100 records.
"""

from __future__ import annotations

import json
from typing import Any

import stripe as _stripe

from .idempotency import with_idempotency


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stripe_obj_to_dict(obj: Any) -> dict:
    """Convert a Stripe API object to a plain dict for easy serialisation."""
    if hasattr(obj, "to_dict_recursive"):
        return obj.to_dict_recursive()
    if hasattr(obj, "__dict__"):
        return {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
    return dict(obj)


def _ok(obj: Any) -> str:
    return json.dumps(_stripe_obj_to_dict(obj), default=str)


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------

def create_customer(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_customer", args)
    customer = client.customers.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(customer)


def list_customers(client: _stripe.StripeClient, args: dict) -> str:
    params: dict[str, Any] = {}
    if args.get("limit"):
        params["limit"] = args["limit"]
    if args.get("email"):
        params["email"] = args["email"]
    # Fix #388 — pagination cursors
    if args.get("starting_after"):
        params["starting_after"] = args["starting_after"]
    if args.get("ending_before"):
        params["ending_before"] = args["ending_before"]
    customers = client.customers.list(params=params)
    return _ok(customers)


def retrieve_customer(client: _stripe.StripeClient, args: dict) -> str:
    customer = client.customers.retrieve(args["customer_id"])
    return _ok(customer)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

def create_product(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_product", args)
    product = client.products.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(product)


def list_products(client: _stripe.StripeClient, args: dict) -> str:
    """List products.

    Fix #388: now accepts ``starting_after`` and ``ending_before`` for cursor-
    based pagination, making it possible to retrieve more than 100 products.
    """
    params: dict[str, Any] = {}
    if args.get("limit"):
        params["limit"] = args["limit"]
    if args.get("active") is not None:
        params["active"] = args["active"]
    # Fix #388 — pagination cursors
    if args.get("starting_after"):
        params["starting_after"] = args["starting_after"]
    if args.get("ending_before"):
        params["ending_before"] = args["ending_before"]
    products = client.products.list(params=params)
    return _ok(products)


def retrieve_product(client: _stripe.StripeClient, args: dict) -> str:
    product = client.products.retrieve(args["product_id"])
    return _ok(product)


# ---------------------------------------------------------------------------
# Prices
# ---------------------------------------------------------------------------

def create_price(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_price", args)
    price = client.prices.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(price)


def list_prices(client: _stripe.StripeClient, args: dict) -> str:
    """List prices.

    Fix #388: now accepts ``starting_after`` and ``ending_before`` cursors.
    """
    params: dict[str, Any] = {}
    if args.get("limit"):
        params["limit"] = args["limit"]
    if args.get("product"):
        params["product"] = args["product"]
    if args.get("active") is not None:
        params["active"] = args["active"]
    # Fix #388 — pagination cursors
    if args.get("starting_after"):
        params["starting_after"] = args["starting_after"]
    if args.get("ending_before"):
        params["ending_before"] = args["ending_before"]
    prices = client.prices.list(params=params)
    return _ok(prices)


# ---------------------------------------------------------------------------
# Payment links
# ---------------------------------------------------------------------------

def create_payment_link(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_payment_link", args)
    link = client.payment_links.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(link)


def list_payment_links(client: _stripe.StripeClient, args: dict) -> str:
    params: dict[str, Any] = {}
    if args.get("limit"):
        params["limit"] = args["limit"]
    if args.get("active") is not None:
        params["active"] = args["active"]
    if args.get("starting_after"):
        params["starting_after"] = args["starting_after"]
    if args.get("ending_before"):
        params["ending_before"] = args["ending_before"]
    links = client.payment_links.list(params=params)
    return _ok(links)


def retrieve_payment_link(client: _stripe.StripeClient, args: dict) -> str:
    link = client.payment_links.retrieve(args["payment_link"])
    return _ok(link)


# ---------------------------------------------------------------------------
# Payment intents
# ---------------------------------------------------------------------------

def create_payment_intent(client: _stripe.StripeClient, args: dict) -> str:
    """Create a PaymentIntent.

    Fix #402: a deterministic idempotency_key is derived from the tool args so
    that any agent-level retry of the exact same call returns the original
    PaymentIntent instead of creating a second charge.
    """
    params = with_idempotency("create_payment_intent", args)
    intent = client.payment_intents.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(intent)


def retrieve_payment_intent(client: _stripe.StripeClient, args: dict) -> str:
    intent = client.payment_intents.retrieve(args["payment_intent"])
    return _ok(intent)


# ---------------------------------------------------------------------------
# Refunds
# ---------------------------------------------------------------------------

def create_refund(client: _stripe.StripeClient, args: dict) -> str:
    """Create a Refund.

    Fix #402: idempotency key prevents duplicate refunds on agent retry.
    """
    params = with_idempotency("create_refund", args)
    refund = client.refunds.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(refund)


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

def create_invoice(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_invoice", args)
    invoice = client.invoices.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(invoice)


def create_invoice_item(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_invoice_item", args)
    item = client.invoice_items.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(item)


def finalize_invoice(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("finalize_invoice", args)
    invoice = client.invoices.finalize_invoice(
        args["invoice"],
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(invoice)


def retrieve_invoice(client: _stripe.StripeClient, args: dict) -> str:
    invoice = client.invoices.retrieve(args["invoice"])
    return _ok(invoice)


def list_invoices(client: _stripe.StripeClient, args: dict) -> str:
    params: dict[str, Any] = {}
    if args.get("limit"):
        params["limit"] = args["limit"]
    if args.get("customer"):
        params["customer"] = args["customer"]
    if args.get("starting_after"):
        params["starting_after"] = args["starting_after"]
    if args.get("ending_before"):
        params["ending_before"] = args["ending_before"]
    invoices = client.invoices.list(params=params)
    return _ok(invoices)


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

def create_subscription(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_subscription", args)
    sub = client.subscriptions.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(sub)


def list_subscriptions(client: _stripe.StripeClient, args: dict) -> str:
    """List subscriptions.

    Fix #388: now supports ``starting_after`` and ``ending_before`` so callers
    can page through accounts with more than 100 active subscriptions.

    Example (paginating through all active subscriptions)::

        page1 = json.loads(list_subscriptions(client, {"status": "active", "limit": 100}))
        last_id = page1["data"][-1]["id"]  # e.g. "sub_xyz"
        page2 = json.loads(list_subscriptions(client, {
            "status": "active",
            "limit": 100,
            "starting_after": last_id,
        }))
    """
    params: dict[str, Any] = {}
    if args.get("limit"):
        params["limit"] = args["limit"]
    if args.get("customer"):
        params["customer"] = args["customer"]
    if args.get("price"):
        params["price"] = args["price"]
    if args.get("status"):
        params["status"] = args["status"]
    # Fix #388 — pagination cursors
    if args.get("starting_after"):
        params["starting_after"] = args["starting_after"]
    if args.get("ending_before"):
        params["ending_before"] = args["ending_before"]
    subs = client.subscriptions.list(params=params)
    return _ok(subs)


def cancel_subscription(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("cancel_subscription", args)
    sub = client.subscriptions.cancel(
        args["subscription"],
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(sub)


def update_subscription(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("update_subscription", args)
    sub_id = args["subscription"]
    update_params = {
        k: v
        for k, v in params.items()
        if k not in {"subscription", "idempotency_key"}
    }
    sub = client.subscriptions.update(
        sub_id,
        params=update_params,
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(sub)


# ---------------------------------------------------------------------------
# Coupons
# ---------------------------------------------------------------------------

def create_coupon(client: _stripe.StripeClient, args: dict) -> str:
    params = with_idempotency("create_coupon", args)
    coupon = client.coupons.create(
        params={k: v for k, v in params.items() if k != "idempotency_key"},
        options={"idempotency_key": params.get("idempotency_key")},
    )
    return _ok(coupon)


def list_coupons(client: _stripe.StripeClient, args: dict) -> str:
    params: dict[str, Any] = {}
    if args.get("limit"):
        params["limit"] = args["limit"]
    if args.get("starting_after"):
        params["starting_after"] = args["starting_after"]
    if args.get("ending_before"):
        params["ending_before"] = args["ending_before"]
    coupons = client.coupons.list(params=params)
    return _ok(coupons)


# ---------------------------------------------------------------------------
# Search (generic)
# ---------------------------------------------------------------------------

def search_stripe_resources(client: _stripe.StripeClient, args: dict) -> str:
    """Search Stripe resources using the Search API.

    Fix #388: the search endpoint supports cursor-based pagination via
    ``page`` (a string token returned by a previous search response's
    ``next_page`` field).  We surface this as ``starting_after`` to match
    the convention of all other list tools; internally it maps to the
    ``page`` query parameter used by Stripe's Search API.

    .. note::
        Stripe's Search API uses ``page`` (not ``starting_after``) for
        pagination.  For consistency with list tools we accept
        ``starting_after`` and forward it as ``page``.
    """
    resource = args.get("resource", "customers")
    query = args.get("query", "")
    params: dict[str, Any] = {"query": query}
    if args.get("limit"):
        params["limit"] = args["limit"]
    # Fix #388 — pagination for search (maps starting_after → page token)
    if args.get("starting_after"):
        params["page"] = args["starting_after"]

    resource_map = {
        "customers": client.customers.search,
        "products": client.products.search,
        "prices": client.prices.search,
        "subscriptions": client.subscriptions.search,
        "payment_intents": client.payment_intents.search,
        "invoices": client.invoices.search,
        "charges": client.charges.search,
    }
    search_fn = resource_map.get(resource)
    if search_fn is None:
        return json.dumps({"error": f"Unknown resource type: {resource!r}"})

    results = search_fn(params=params)
    return _ok(results)
"""
tests/test_fixes.py
-------------------
Tests for:
  * Fix #402 — stable idempotency keys prevent duplicate charges on agent retry
  * Fix #388 — pagination (starting_after / ending_before) on list/search tools
"""

from __future__ import annotations

import json
import sys
import types
import unittest
from unittest.mock import MagicMock, patch, call

# ---------------------------------------------------------------------------
# Bootstrap: make the package importable without installing
# ---------------------------------------------------------------------------
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from stripe_agent_toolkit.idempotency import (
    idempotency_key_for,
    with_idempotency,
    MUTATING_TOOLS,
)
import stripe_agent_toolkit.api as api_module


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_stripe_obj(data: dict) -> MagicMock:
    """Return a mock that mimics to_dict_recursive()."""
    m = MagicMock()
    m.to_dict_recursive.return_value = data
    return m


def _make_client() -> MagicMock:
    """Return a minimal mock StripeClient."""
    client = MagicMock()
    return client


# ===========================================================================
# Fix #402 — Idempotency
# ===========================================================================

class TestIdempotencyKeyGeneration(unittest.TestCase):
    """idempotency_key_for() must be stable and scoped to mutating tools."""

    def test_same_args_same_key(self):
        args = {"amount": 1000, "currency": "usd", "customer": "cus_abc"}
        k1 = idempotency_key_for("create_payment_intent", args)
        k2 = idempotency_key_for("create_payment_intent", args)
        self.assertEqual(k1, k2)

    def test_different_args_different_key(self):
        k1 = idempotency_key_for("create_payment_intent", {"amount": 100, "currency": "usd"})
        k2 = idempotency_key_for("create_payment_intent", {"amount": 200, "currency": "usd"})
        self.assertNotEqual(k1, k2)

    def test_dict_order_does_not_matter(self):
        k1 = idempotency_key_for("create_customer", {"name": "Alice", "email": "a@b.com"})
        k2 = idempotency_key_for("create_customer", {"email": "a@b.com", "name": "Alice"})
        self.assertEqual(k1, k2)

    def test_read_only_tool_returns_none(self):
        self.assertIsNone(idempotency_key_for("list_customers", {"limit": 10}))
        self.assertIsNone(idempotency_key_for("retrieve_customer", {"customer_id": "cus_1"}))
        self.assertIsNone(idempotency_key_for("list_subscriptions", {"status": "active"}))

    def test_all_mutating_tools_return_key(self):
        for tool in MUTATING_TOOLS:
            with self.subTest(tool=tool):
                key = idempotency_key_for(tool, {"dummy": "arg"})
                self.assertIsNotNone(key)
                self.assertEqual(len(key), 64)  # SHA-256 hex digest

    def test_with_idempotency_injects_key_for_mutating(self):
        result = with_idempotency("create_payment_intent", {"amount": 500, "currency": "usd"})
        self.assertIn("idempotency_key", result)
        self.assertEqual(len(result["idempotency_key"]), 64)

    def test_with_idempotency_does_not_mutate_original(self):
        args = {"amount": 500, "currency": "usd"}
        with_idempotency("create_payment_intent", args)
        self.assertNotIn("idempotency_key", args)

    def test_with_idempotency_leaves_read_only_unchanged(self):
        args = {"limit": 10}
        result = with_idempotency("list_customers", args)
        self.assertNotIn("idempotency_key", result)
        self.assertEqual(result, args)


class TestCreatePaymentIntentIdempotency(unittest.TestCase):
    """create_payment_intent forwards the idempotency key to Stripe."""

    def test_idempotency_key_forwarded(self):
        client = _make_client()
        client.payment_intents.create.return_value = _make_stripe_obj(
            {"id": "pi_123", "amount": 1000, "currency": "usd", "status": "requires_payment_method"}
        )

        args = {"amount": 1000, "currency": "usd"}
        api_module.create_payment_intent(client, args)

        call_kwargs = client.payment_intents.create.call_args
        options = call_kwargs.kwargs.get("options") or (call_kwargs[1].get("options") if call_kwargs[1] else None)
        self.assertIsNotNone(options)
        self.assertIn("idempotency_key", options)
        self.assertEqual(len(options["idempotency_key"]), 64)

    def test_retry_uses_same_idempotency_key(self):
        """Simulates an agent retrying the exact same call — the key must match."""
        args = {"amount": 1000, "currency": "usd", "customer": "cus_test"}
        key1 = idempotency_key_for("create_payment_intent", args)
        key2 = idempotency_key_for("create_payment_intent", args)
        self.assertEqual(key1, key2,
                         "Retry of same call must produce the same idempotency key")


class TestCreateRefundIdempotency(unittest.TestCase):
    def test_idempotency_key_forwarded(self):
        client = _make_client()
        client.refunds.create.return_value = _make_stripe_obj({"id": "re_1", "amount": 500})

        api_module.create_refund(client, {"charge": "ch_123", "amount": 500})

        call_kwargs = client.refunds.create.call_args
        options = call_kwargs.kwargs.get("options") or {}
        self.assertIn("idempotency_key", options)


# ===========================================================================
# Fix #388 — Pagination
# ===========================================================================

class TestListSubscriptionsPagination(unittest.TestCase):
    def _subscriptions_response(self, last_id: str = "sub_zzz") -> MagicMock:
        return _make_stripe_obj({
            "object": "list",
            "data": [{"id": last_id, "status": "active"}],
            "has_more": True,
        })

    def test_starting_after_forwarded(self):
        client = _make_client()
        client.subscriptions.list.return_value = self._subscriptions_response()

        api_module.list_subscriptions(client, {"limit": 100, "starting_after": "sub_xyz"})

        params = client.subscriptions.list.call_args.kwargs.get("params", {})
        self.assertEqual(params.get("starting_after"), "sub_xyz")

    def test_ending_before_forwarded(self):
        client = _make_client()
        client.subscriptions.list.return_value = self._subscriptions_response()

        api_module.list_subscriptions(client, {"limit": 100, "ending_before": "sub_abc"})

        params = client.subscriptions.list.call_args.kwargs.get("params", {})
        self.assertEqual(params.get("ending_before"), "sub_abc")

    def test_no_cursor_omits_pagination_params(self):
        client = _make_client()
        client.subscriptions.list.return_value = self._subscriptions_response()

        api_module.list_subscriptions(client, {"limit": 10, "status": "active"})

        params = client.subscriptions.list.call_args.kwargs.get("params", {})
        self.assertNotIn("starting_after", params)
        self.assertNotIn("ending_before", params)


class TestListProductsPagination(unittest.TestCase):
    def test_starting_after_forwarded(self):
        client = _make_client()
        client.products.list.return_value = _make_stripe_obj({"object": "list", "data": []})

        api_module.list_products(client, {"limit": 100, "starting_after": "prod_abc"})

        params = client.products.list.call_args.kwargs.get("params", {})
        self.assertEqual(params.get("starting_after"), "prod_abc")


class TestListPricesPagination(unittest.TestCase):
    def test_starting_after_forwarded(self):
        client = _make_client()
        client.prices.list.return_value = _make_stripe_obj({"object": "list", "data": []})

        api_module.list_prices(client, {"limit": 100, "starting_after": "price_abc"})

        params = client.prices.list.call_args.kwargs.get("params", {})
        self.assertEqual(params.get("starting_after"), "price_abc")


class TestSearchPagination(unittest.TestCase):
    def test_starting_after_maps_to_page_token(self):
        """search_stripe_resources maps starting_after → 'page' for the Search API."""
        client = _make_client()
        client.customers.search.return_value = _make_stripe_obj({
            "object": "search_result",
            "data": [],
            "next_page": None,
        })

        api_module.search_stripe_resources(client, {
            "resource": "customers",
            "query": "email:'test@example.com'",
            "starting_after": "page_token_xyz",
        })

        params = client.customers.search.call_args.kwargs.get("params", {})
        self.assertEqual(params.get("page"), "page_token_xyz",
                         "starting_after must be forwarded as 'page' to the Search API")

    def test_unknown_resource_returns_error_json(self):
        client = _make_client()
        result = api_module.search_stripe_resources(client, {
            "resource": "unknown_resource",
            "query": "foo",
        })
        data = json.loads(result)
        self.assertIn("error", data)


# ===========================================================================
# Pagination — end-to-end cursor chaining simulation
# ===========================================================================

class TestPaginationCursorChaining(unittest.TestCase):
    """Simulate a full multi-page traversal of subscriptions."""

    def test_full_page_traversal(self):
        client = _make_client()

        page1_data = [{"id": f"sub_{i:03d}", "status": "active"} for i in range(100)]
        page2_data = [{"id": f"sub_{i:03d}", "status": "active"} for i in range(100, 140)]

        def _list_side_effect(params=None, **_):
            sa = (params or {}).get("starting_after")
            if sa is None:
                return _make_stripe_obj({"data": page1_data, "has_more": True})
            elif sa == "sub_099":
                return _make_stripe_obj({"data": page2_data, "has_more": False})
            raise AssertionError(f"Unexpected starting_after: {sa!r}")

        client.subscriptions.list.side_effect = _list_side_effect

        # Page 1
        r1 = json.loads(api_module.list_subscriptions(client, {"limit": 100, "status": "active"}))
        self.assertEqual(len(r1["data"]), 100)
        self.assertTrue(r1["has_more"])

        last_id = r1["data"][-1]["id"]  # "sub_099"

        # Page 2
        r2 = json.loads(api_module.list_subscriptions(client, {
            "limit": 100,
            "status": "active",
            "starting_after": last_id,
        }))
        self.assertEqual(len(r2["data"]), 40)
        self.assertFalse(r2["has_more"])

        total = len(r1["data"]) + len(r2["data"])
        self.assertEqual(total, 140)


if __name__ == "__main__":
    unittest.main()
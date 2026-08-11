"""Ground-truth dataset for `classify()`, hand-derived from the real,
live `mcp.stripe.com` catalog (not guessed at) -- run this to reproduce
the results in `VERIFICATION.md`.

    python eval_dataset.py

Each case is `(method, args, description, expected_high_risk)`. The
first 9 are the real catalog as observed live; the rest are the
regressions the three bugs documented in `governance.py` were caught
by, kept here so they can't silently regress again.
"""

from __future__ import annotations

import sys

sys.path.insert(0, "../..")

from stripe_agent_toolkit.tulip.governance import classify

CASES: list[tuple[str, dict, str, bool]] = [
    # -- the real, live-fetched catalog (9 tools, observed directly) --
    (
        "get_stripe_account_info",
        {},
        "Get information about your Stripe account",
        False,
    ),
    (
        "search_stripe_documentation",
        {},
        "Search Stripe's documentation for guidance",
        False,
    ),
    (
        "send_stripe_mcp_feedback",
        {},
        "Send feedback about the Stripe MCP server itself",
        False,
    ),
    (
        "stripe_api_details",
        {},
        "Look up the parameters required for a given Stripe API operation id",
        False,
    ),
    (
        "stripe_api_search",
        {},
        (
            "Search for Stripe API operations by providing an intent and "
            "a resource to operate on. For the resource, use a specific, "
            'descriptive phrase (e.g. "issuing card transactions", '
            '"payout methods", "outbound payments").'
        ),
        False,  # bug #3: "payout methods" is example text, not a real payout
    ),
    (
        "stripe_implementation_planner",
        {},
        "Plan a multi-step Stripe integration before writing code",
        False,
    ),
    (
        "create_refund",
        {"charge": "ch_1"},
        "Refund a charge, returning money from the merchant to the customer",
        True,
    ),
    (
        "stripe_api_write",
        {"stripe_api_operation_id": "PostRefunds", "parameters": {}},
        "Write data via any Stripe API POST/PATCH/PUT/DELETE operation...",
        True,  # bug #1: operation id, not the boilerplate description, decides this
    ),
    (
        "stripe_api_read",
        {"stripe_api_operation_id": "GetCharges", "parameters": {}},
        "Read data from any Stripe API GET operation...",
        False,
    ),
    # -- regressions the three real bugs were caught by --
    (
        "stripe_api_write",
        {"stripe_api_operation_id": "PostCustomers", "parameters": {}},
        "Write data via any Stripe API POST/PATCH/PUT/DELETE operation...",
        False,  # bug #2: dispatcher boilerplate mentions "DELETE"; must not blanket-flag
    ),
    (
        "stripe_api_write",
        {"stripe_api_operation_id": "DeleteCustomers", "parameters": {}},
        "Write data via any Stripe API POST/PATCH/PUT/DELETE operation...",
        True,
    ),
]


def main() -> None:
    correct = 0
    print(
        f"{'method':20s} {'operation/desc':45s} {'expected':>9s} {'got':>9s}"
    )
    for method, args, description, expected in CASES:
        action = classify(method, args, description)
        got = "high-risk" in action.tags
        correct += int(got == expected)
        op = args.get("stripe_api_operation_id", description[:40])
        status = "OK" if got == expected else "MISMATCH"
        print(f"{method:20s} {op:45s} {expected!s:>9s} {got!s:>9s} {status}")

    print(f"\nrule-based classify() accuracy: {correct}/{len(CASES)}")


if __name__ == "__main__":
    main()

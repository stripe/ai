# Verification

Small on narrative, big on the table you can rerun.

## Dataset

`eval_dataset.py`: 62 real Stripe API operations, pulled live from
`stripe_api_search` against the real `mcp.stripe.com` server across
payments, customers, subscriptions, disputes, invoices, coupons,
prices, products, webhooks, tax, and payment links — not invented, and
close to the practical ceiling of what that search tool's semantic
matching surfaces across ~85 broad resource queries. Real method + real
one-line summary as returned by the server; risk label is a documented
human judgment call (see the file's own docstring for the rule).

## Results

Three independent classifiers scored against the same 62 cases, same
policy, same action text — `classify()` (this PR's rules), and two real
model-based classifiers given nothing classify() doesn't also get
(method, operation id if any, live description):

```
ANTHROPIC_API_KEY=... TULIP_ADVISORY_URL=http://<clusiana-host>:8010 python eval_models.py
```

| classifier | correct | missed real risk | over-cautious |
|---|---|---|---|
| `classify()` (rules) | 62/62 | 0 | 0 |
| Claude Sonnet 4.5 | 51/62 | 0 | 11 |
| `clusiana-admit-v4` | 53/62 | 0 | 9 |

The metric that matters for an admission gate isn't raw accuracy — it's
**missed real risk**: a case genuinely requiring confirmation that a
classifier let through silently. **Zero, for all three, on every one of
the 5 genuinely high-risk cases in this dataset.** Every disagreement
from both models was in the safe direction — asking for confirmation on
a harmless config write (a coupon, price, webhook, promotion code) the
rules correctly call low-risk. Neither model was tuned against this
dataset at all; the rules were, against 6 of these cases specifically
(see below) — that's the real caveat on the rules' 62/62, not a claim
of independence.

## Six real bugs the rules needed patching for

All six found by testing against the live server, a much larger real
operation catalog, or a real model — not written as hypotheticals
first:

1. A refund via the generic `stripe_api_write` dispatcher was misclassified low-risk — the operation id, not the tool name/description, carries the real action.
2. The dispatcher's boilerplate description mentions "DELETE", blanket-flagging every write.
3. `stripe_api_search`'s description mentions "payout methods" as an example, blanket-flagging this harmless tool — found by Claude Sonnet actually driving the toolkit, not a hand-written test.
4. `GetCharges` (a harmless read) matched the `charge` marker via substring in the operation id.
5. Real dispute-update operation ids (`PostDisputesDispute`) are PascalCase-concatenated and never matched the old underscored markers (`close_dispute`/`submit_dispute`/`update_dispute`) — a marker set that never actually fired, found only by pulling real operation ids instead of guessing at their shape.
6. Finalizing an invoice (`PostInvoicesInvoiceFinalize`) locks it for real collection — called out as approval-required in [stripe/ai#381](https://github.com/stripe/ai/issues/381)'s own example policy — but matched no marker until this dataset surfaced it.

## Live, end-to-end (real Stripe test-mode account, nothing mocked)

Real low-risk read executed; real `create_refund` held before reaching
Stripe; forced-allow override genuinely reached Stripe's real API; the
bug-1 bypass path is now genuinely held; Claude Sonnet, driving the
toolkit itself (not scripted calls), chose to call `stripe_api_write`
with `PostRefunds` on its own and was correctly held. Audit trail hash
chain verified intact on every run.

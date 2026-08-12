# Verification

Small on narrative, big on the table you can rerun.

## Dataset

`eval_dataset.py`, `CASES`: 62 real Stripe API operations, pulled live from
`stripe_api_search` against the real `mcp.stripe.com` server across
payments, customers, subscriptions, disputes, invoices, coupons,
prices, products, webhooks, tax, and payment links — not invented, and
close to the practical ceiling of what that search tool's semantic
matching surfaces across ~85 broad resource queries. Real method + real
one-line summary as returned by the server; risk label is a documented
human judgment call (see the file's own docstring for the rule).

`REGRESSION_CASES`: 10 further cases, kept deliberately separate because
they are **not** live-pulled — they are hand-written from the five tools
[stripe/ai#381](https://github.com/stripe/ai/issues/381) names as
dangerous, in both shapes the toolkit can present them (an individually
named tool, and a write-dispatcher operation id), plus the reads of the
same resources that must stay low-risk. They exist because of bug 7
below. `eval_models.py` scores all 72 together.

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

**These numbers predate bug 7 and are not rerun here.** They score the
62 live-pulled cases against the pre-fix labels; two of those labels
(the payment-link writes) have since changed and 10 regression cases
were added, so the model rows would have to be re-scored against live
endpoints to be comparable. The rules pass all 72 today
(`python -m unittest discover tests`); the model rows are left at their
original, honestly-dated values rather than silently restated.

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

## Seven real bugs the rules needed patching for

All seven found by testing against the live server, a much larger real
operation catalog, a real model, or the issue this PR answers — not
written as hypotheticals first:

1. A refund via the generic `stripe_api_write` dispatcher was misclassified low-risk — the operation id, not the tool name/description, carries the real action.
2. The dispatcher's boilerplate description mentions "DELETE", blanket-flagging every write.
3. `stripe_api_search`'s description mentions "payout methods" as an example, blanket-flagging this harmless tool — found by Claude Sonnet actually driving the toolkit, not a hand-written test.
4. `GetCharges` (a harmless read) matched the `charge` marker via substring in the operation id.
5. Real dispute-update operation ids (`PostDisputesDispute`) are PascalCase-concatenated and never matched the old underscored markers (`close_dispute`/`submit_dispute`/`update_dispute`) — a marker set that never actually fired, found only by pulling real operation ids instead of guessing at their shape.
6. Finalizing an invoice (`PostInvoicesInvoiceFinalize`) locks it for real collection — called out as approval-required in [stripe/ai#381](https://github.com/stripe/ai/issues/381)'s own example policy — but matched no marker until this dataset surfaced it.
7. **Creating a charge was not high-risk.** Every marker in the set is a reversal or destruction verb — money leaving, liability accepted, a record destroyed. None of them describe money *arriving*, so `create_payment_intent` (initiates a real charge on a card) and `create_checkout_session` (stands up a live, payable page) — the two tools #381 names **first** — classified low-risk and executed, in both the named-tool and `PostPaymentIntents`/`PostCheckoutSessions` dispatcher shapes. Fixed by `_initiates_payment()`, which requires a payment-surface stem *and* a creating verb so reads of the same resources stay low-risk.

   The dataset is why this survived six earlier rounds: its labeling rule scoped risk to money moving *out*, so no charge-initiating write was ever a case, and the two payment-link writes — the label its own docstring flagged as the arguable one — were labeled `False`. Both are now `True`, on the reasoning that a payment link is the same live payment surface as a Checkout Session. A ground-truth set built from one framing can only find bugs inside that framing; it took reading #381's own list of tools to see the other half.

## Live, end-to-end (real Stripe test-mode account, nothing mocked)

Real low-risk read executed; real `create_refund` held before reaching
Stripe; forced-allow override genuinely reached Stripe's real API; the
bug-1 bypass path is now genuinely held; Claude Sonnet, driving the
toolkit itself (not scripted calls), chose to call `stripe_api_write`
with `PostRefunds` on its own and was correctly held. Audit trail hash
chain verified intact on every run.

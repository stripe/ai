# Verification

Small and dataset-driven on purpose — a table you can rerun, not a claim.

## Dataset

`eval_dataset.py`: 11 cases, hand-labeled from the real, live
`mcp.stripe.com` catalog (9 tools) plus the dispatcher-args cases a
static description alone can't carry. Small, and honestly labeled as
such — not a claim of statistical coverage.

## Results

Three independent classifiers scored against the same 11 cases, same
policy, same action text: this package's rule-based `classify()`, and
two real model-based classifiers given nothing classify() doesn't also
get (method, operation id if any, live description).

```
ANTHROPIC_API_KEY=... TULIP_ADVISORY_URL=http://<clusiana-host>:8010 python eval_models.py
```

| classifier | score | notes |
|---|---|---|
| `classify()` (rules) | 11/11 | hand-fixed on 4 of these cases — see below |
| Claude Sonnet 4.5 | 11/11 | no fixing, reads the operation id + description directly |
| `clusiana-admit-v4` | 10/11 | missed the `PostCustomers` case — over-indexed on the literal word "DELETE" in the dispatcher's boilerplate description even with the operation id present |

`classify()`'s 11/11 is real but not fully independent — the rules were
patched specifically against 4 of these 11 cases (see below). Sonnet's
and Clusiana's scores are the fairer signal: neither was tuned against
this dataset at all.

## Four real bugs the rules needed patching for

All four found by testing against the live server or a real model, not
written as hypotheticals first:

1. A refund via the generic `stripe_api_write` dispatcher was misclassified low-risk — the operation id, not the tool name/description, carries the real action.
2. The dispatcher's boilerplate description mentions "DELETE", blanket-flagging every write.
3. `stripe_api_search`'s description mentions "payout methods" as an example, blanket-flagging this harmless tool — found by Claude Sonnet actually driving the toolkit, not a hand-written test.
4. `GetCharges` (a harmless read) matched the `charge` marker via substring in the operation id.

## Live, end-to-end (real Stripe test-mode account, nothing mocked)

Real low-risk read executed; real `create_refund` held before reaching
Stripe; forced-allow override genuinely reached Stripe's real API; the
bug-1 bypass path is now genuinely held; Claude Sonnet, driving the
toolkit itself (not scripted calls), chose to call `stripe_api_write`
with `PostRefunds` on its own and was correctly held. Audit trail hash
chain verified intact on every run.

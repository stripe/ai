---
name: metronome
description: >-
  Guides Metronome usage-based billing integration decisions — event ingestion
  (single and batch, idempotency, billable metrics), contract design (rate
  cards, overrides, dimensional pricing, products), invoicing lifecycle (grace
  periods, finalization, Stripe sync), credit and commit management (prepaid,
  postpaid, thresholds, auto-recharge), and Stripe integration (arrears
  invoicing, tax providers, line item limits). Use when building, modifying, or
  reviewing any Metronome integration — including ingesting usage events,
  creating contracts or rate cards, managing credits and commits, configuring
  invoicing, or syncing invoices with Stripe Billing.

---

Metronome API base: `https://api.metronome.com`. Authenticate with a Bearer token in the `Authorization` header. Always use Contracts (not legacy Plans) for new integrations.

## Integration routing

| Building… | Recommended API | Details |
| --- | --- | --- |
| Ingesting usage events | `POST /v1/ingest` (batch) | [Send usage events](https://docs.metronome.com/guides/events/send-usage-events.md), the [API quickstart](https://docs.metronome.com/guides/get-started/api-quickstart.md), the [Ingest API reference](https://docs.metronome.com/api-reference/usage/ingest-events.md), and [Set ingest aliases](https://docs.metronome.com/api-reference/customers/create-or-update-customer-ingest-aliases.md) |
| Defining what to measure | Billable Metrics API | [Create billable metrics](https://docs.metronome.com/guides/implement-metronome/core-concepts/create-billable-metrics.md) |
| Enterprise pricing agreements | Contracts + Rate Cards | [Provision a customer contract](https://docs.metronome.com/guides/implement-metronome/core-concepts/provision-contract.md), [Create and manage rate cards](https://docs.metronome.com/guides/implement-metronome/core-concepts/create-manage-rate-cards.md), and the [Create a contract](https://docs.metronome.com/api-reference/contracts/create-a-contract.md) and [Add rates](https://docs.metronome.com/api-reference/rate-cards/add-rates.md) API references |
| Mid-term contract changes | Contract Edits | [Edit a contract](https://docs.metronome.com/guides/pricing-packaging/make-pricing-changes/edit-contract.md), [Contract edits and overrides](https://docs.metronome.com/guides/pricing-packaging/make-pricing-changes/edit-or-override-a-contract.md), and [Manage contract lifecycle](https://docs.metronome.com/guides/customers-billing/manage-customers/manage-customer-lifecycle.md) |
| Invoice lifecycle and finalization | Invoices API | [How Metronome invoices work](https://docs.metronome.com/guides/implement-metronome/core-concepts/how-invoicing-works.md) |
| Prepaid or postpaid commitments and one-off top-ups | Commits + Credits | [Apply credits and commits to contracts](https://docs.metronome.com/guides/pricing-packaging/apply-credits-and-commits/create-a-pre-paid-commit.md) and [Payment-gated commits](https://docs.metronome.com/guides/pricing-packaging/apply-credits-and-commits/manual-payment-gated-commits.md) |
| Syncing invoices to Stripe | Stripe billing provider config | [Invoice with Stripe](https://docs.metronome.com/integrations/invoice-integrations/stripe.md) |
| Prepaid balances, auto-recharge, spend alerts, and thresholds | Notifications API | [Set prepaid balance thresholds](https://docs.metronome.com/guides/customers-billing/optimize-customer-experience/prepaid-balance-thresholds.md), [Enforce spend thresholds](https://docs.metronome.com/guides/customers-billing/optimize-customer-experience/set-customer-spend-control.md), and [Threshold notifications](https://docs.metronome.com/guides/pricing-packaging/apply-credits-and-commits/alerts.md) |

Read the linked page before answering any integration question or writing code; the links return plain Markdown. If no row fits, use the [documentation index](https://docs.metronome.com/llms.txt) to find the right page, and append `.md` to the page URL to fetch it as Markdown.

## Critical rules

- *Always read the linked documentation page before naming a Metronome endpoint, field, or amount.* Endpoint paths, request shapes, and units can be misremembered; the routing table above points to the page for each task.
- *Always use Contracts*, not legacy Plans, for new customers. Plans are deprecated and lack rate card overrides, commits, and flexible scheduling. An existing Plans integration keeps working: don’t propose migrating it unless asked, and when migrating move credit balances with `POST /v1/credits/migrateToContracts`.
- *Always use Edits* (`POST /v2/contracts/edit`), not deprecated Amendments (`/v1/contracts/amend`), for mid-term changes to a contract (new products, commits, overrides). Edits are the actively invested path and required for v2 subscription features. Create a new contract with `transition: {type: "renewal", from_contract_id}` only for renewals.
- *Always use batch ingestion* (`POST /v1/ingest` with a bare JSON array of 1 to 100 event objects as the request body, not wrapped in an object) for production workloads. Single-event ingestion is acceptable only for testing. A `200` means the events were accepted, not rated: events whose `event_type` matches no billable metric are stored but excluded from usage, so create billable metrics before sending.
- *Always include a unique `transaction_id`* on every event, fixed when the event is recorded and re-sent unchanged on every retry: a UUID stored with the event, or a value derived from the source record. This is the idempotency key that prevents double-counting on retries; an ID regenerated per attempt defeats it.
- *Always deliver usage for a billing period before its grace period ends* (24 hours after `billing_period_end_date` by default). A finalized invoice ignores late events and can only be corrected by voiding and regenerating it; if your pipeline’s worst-case lag exceeds the grace period, ask Metronome support to lengthen it (it isn’t configurable through the API).
- *Always set a `usage_filter`* (`group_key` and `group_values`) on each contract when a customer has more than one concurrent contract, so usage is rated on one contract instead of all of them. The group key must be a group key on the streaming billable metric (an event property for SQL metrics).
- *Never schedule a contract-level commit or credit access segment past the contract’s `ending_before`.* Usage after the contract ends isn’t rated on it, so balance released after that date is stranded; end the last segment at the contract term and use `rollover_fraction` to carry a remaining balance into a renewal.
- *Never put `applicable_product_ids`, `applicable_product_tags`, or `specifiers` on a `spend_threshold_configuration` commit.* Spend-threshold commits apply to all usage and take only `product_id`, `name`, `description`, and `priority`; only `prepaid_balance_threshold_configuration` commits accept product filters.
- *Never process multiple Metronome invoices for the same Stripe customer simultaneously.* Concurrent processing causes race conditions on pending line items.
- *Never hardcode pricing directly in contracts.* Define pricing in rate cards and use contract-level overrides for custom rates. This ensures un-overridden pricing stays current when the rate card changes.
- *Always send USD amounts in cents.* Metronome’s default USD credit type is denominated in cents (`1000` is 10.00 USD) for thresholds, commits, credits, and rate or override prices; other currencies use whole units.
- *Never finalize a Stripe invoice before tax calculation completes.* If using Stripe Tax, Avalara, or Anrok, the tax provider must process the invoice before finalization.
- *Never exceed 250 line items per Stripe invoice.* Exceeding this limit causes all line items to collapse into a single entry, losing per-product detail. Plan product granularity and use composite products to aggregate high-cardinality metrics.
- *Always reconcile payments against the Stripe invoice total, never the Metronome invoice `total`.* Metronome sends untaxed line items and Stripe adds tax at finalization, so the Metronome total is pre-tax and can differ by sub-cent rounding.
- *Never set NetSuite as both a contract’s `billing_provider_configuration` and its `revenue_system_configuration`.* Use the billing configuration when NetSuite issues and collects the invoice; use the revenue system configuration only when another provider such as Stripe bills and NetSuite needs the invoice for revenue recognition.

## Key documentation

When the user’s request doesn’t clearly fit a single domain above, consult:

- [Metronome Documentation](https://docs.metronome.com/): Start here for any Metronome question.
- [API Reference](https://docs.metronome.com/api-reference/): Full endpoint reference.
- [LLM-friendly doc index](https://docs.metronome.com/llms.txt): Machine-readable documentation index.
- [Stripe Integration Guide](https://docs.metronome.com/integrations/invoice-integrations/stripe.md): Syncing Metronome invoices with Stripe.
- [How Metronome works with Stripe](https://docs.stripe.com/billing/how-metronome-works-with-stripe.md): The Stripe guide to the integration patterns and what stays on Stripe.

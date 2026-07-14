# Tax / Stripe Tax

## Table of contents

- When tax applies
- Two-step setup
- If jurisdictions are unknown
- If the region or tax type isn’t supported

## When tax applies

Use Stripe Tax for any subscription, invoice, or Checkout Session where the merchant has customers across multiple jurisdictions. It handles sales tax, VAT, and GST automatically based on the customer’s location and the merchant’s active registrations. See the [Tax overview](https://docs.stripe.com/tax.md) for supported regions and tax types.

## Two-step setup

1. Add a registration for each jurisdiction where the merchant is obligated to collect tax. Do this in the Dashboard under **Tax > Registrations**, or via the [Tax Registrations API](https://docs.stripe.com/api/tax/registrations.md).
2. Pass `automatic_tax: { enabled: true }` on the [Subscription](https://docs.stripe.com/api/subscriptions.md), [Invoice](https://docs.stripe.com/api/invoices.md), or [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) object.

It’s safe to enable `automatic_tax` before any registrations exist — Stripe won’t collect tax until at least one registration is active.

**Traps to avoid:** `automatic_tax` and explicit `tax_rates` are mutually exclusive. For existing subscriptions, clear `default_tax_rates` and all item-level `tax_rates` before enabling `automatic_tax` — the update will fail otherwise. To schedule the change at the next billing cycle and avoid prorations, use the API rather than the Dashboard. For bulk migrations, use the [Tax migration tool](https://docs.stripe.com/billing/taxes/migration.md).

**Traps to avoid:** For EU merchants, one OSS union registration covers all 27 member states. Don’t register an individual EU country separately unless the merchant has a physical presence there.

## If jurisdictions are unknown

Don’t guess which jurisdictions apply. Prompt the user: “Go to Dashboard > Tax > Registrations, add the states or countries where you have customers, then come back.”

## If the region or tax type isn’t supported

Check the [supported countries list](https://docs.stripe.com/tax/supported-countries.md). If the jurisdiction isn’t listed, tell the user:

- Stripe Tax doesn’t support that region yet
- They can collect tax manually using `tax_rates` on the subscription or invoice instead
- For unsupported tax types (customs duties, excise taxes), Stripe Tax doesn’t apply — those are out of scope

Don’t attempt to approximate using a supported region as a proxy.

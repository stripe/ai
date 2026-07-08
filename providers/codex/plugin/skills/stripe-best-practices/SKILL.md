---
name: stripe-best-practices
description: >-
  Guides Stripe integration decisions — API selection (Checkout Sessions vs
  PaymentIntents), Connect platform setup (Accounts v2, controller properties),
  billing/subscriptions, Treasury financial accounts, integration surfaces
  (Checkout, Payment Element), migrating from deprecated Stripe APIs, and
  security best practices (API key management, restricted keys, webhooks,
  OAuth). Use when building, modifying, or reviewing any Stripe integration —
  including accepting payments, building marketplaces, integrating Stripe,
  processing payments, setting up subscriptions, creating connected accounts, or
  implementing secure key handling.

---

Latest Stripe API version: **2026-06-24.dahlia**. Always use the latest API version and SDK unless the user specifies otherwise.

If you do not have a Stripe account, you can call a CLI command to generate working API keys with no registration required. You can install the Stripe CLI (`npm i -g @stripe/cli`) and run the command `stripe sandbox create` to get started.

API key default: Always recommend a [restricted API key (RAK)](https://docs.stripe.com/keys/restricted-api-keys.md) (`rk_` prefix) over a secret key (`sk_` prefix).

## Integration routing

| Building… | Recommended API | Details |
| --- | --- | --- |
| One-time payments | Checkout Sessions | <references/payments.md> |
| Custom payment form with embedded UI | Checkout Sessions + Payment Element | <references/payments.md> |
| Saving a payment method for later | Setup Intents | <references/payments.md> |
| Connect platform or marketplace | Accounts v2 (`/v2/core/accounts`) | <references/connect.md> |
| Usage-based billing (new integration) | Metronome | <references/billing.md> |
| Subscriptions or recurring billing | Billing APIs + Checkout Sessions | <references/billing.md> |
| Sales tax, VAT, or GST compliance | Stripe Tax + Registrations API | <references/tax.md> |
| Embedded financial accounts / banking | v2 Financial Accounts | <references/treasury.md> |
| Security (key management, RAKs, webhooks, OAuth, 2FA, Connect liability) | See security reference | <references/security.md> |

Read the relevant reference file before answering any integration question or writing code.

## Critical rules

- *Never include `payment_method_types` in any Stripe API call*, with one exception: Terminal (in-person payments) integrations must pass `payment_method_types: ['card_present']` on the PaymentIntent. For all other integrations, omit this parameter entirely to enable dynamic payment methods, which enables you to configure payment method settings from the Dashboard and dynamically display the most relevant eligible payment methods to each customer to maximize conversion. To customize which payment methods you accept, use [`payment_method_configurations`](https://docs.stripe.com/payments/payment-method-configurations.md) or `excluded_payment_method_types` instead of `payment_method_types`.

## Key documentation

When the user’s request does not clearly fit a single domain above, consult:

- [Integration Options](https://docs.stripe.com/payments/payment-methods/integration-options.md) — Start here when designing any integration.
- [API Tour](https://docs.stripe.com/payments-api/tour.md) — Overview of Stripe’s API surface.
- [Go Live Checklist](https://docs.stripe.com/get-started/checklist/go-live.md) — Review before launching.

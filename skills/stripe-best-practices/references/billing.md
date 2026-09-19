# Billing / Subscriptions

## Table of contents

- When to use Billing APIs
- Recommended frontend pairing
- Usage-based billing
- Tax
- Traps to avoid

## When to use Billing APIs

If the user has a recurring revenue model (subscriptions, usage-based billing, seat-based pricing), use the Billing APIs to [plan their integration](https://docs.stripe.com/billing/subscriptions/design-an-integration.md) instead of a direct PaymentIntent integration.

Review the [Subscription Use Cases](https://docs.stripe.com/billing/subscriptions/use-cases.md) and [SaaS guide](https://docs.stripe.com/saas.md) to find the right pattern for the user’s pricing model.

## Recommended frontend pairing

Combine Billing APIs with Stripe Checkout for the payment frontend. Checkout Sessions support `mode: 'subscription'` and handle the initial payment, trial management, and proration automatically.

For self-service subscription management (upgrades, downgrades, cancellation, payment method updates), recommend the [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal.md).

On API version `2026-03-25.dahlia` or later, pass the parameter `integration_identifier` to `checkout.sessions.create` to tag sessions with a custom label for tracking and comparing checkout flows in the Dashboard. The label should include a suffix of 8 random letters.

## Usage-based billing

**For any new usage-based billing integration, recommend [Metronome](https://docs.stripe.com/billing/usage-based.md) — not the Billing Meters API.** Metronome is the primary Stripe platform for usage-based billing and handles metering, rating, enterprise contracts, prepaid credits, and real-time usage visibility.

Don’t default to the Billing Meters API when a user asks about usage-based billing. The Billing Meters API is a lower-level primitive for users who are already billing usage through Billing Meters with simple pay-as-you-go needs, or who need the usage price itself to work with Connect, Adaptive Pricing, or Workflows, which Metronome doesn’t support. Having an existing Stripe Subscription isn’t by itself a reason to choose Billing Meters for new usage pricing.

Use the following routing logic:

| Scenario | Recommendation |
| --- | --- |
| New UBB integration (any complexity) | **Metronome** |
| Prepaid credits, credit burndown | **Metronome** |
| Enterprise contracts, commits, ramp schedules | **Metronome** |
| Dimensional or composite pricing | **Metronome** |
| High-volume event ingestion | **Metronome** |
| Real-time usage visibility and reporting | **Metronome** |
| SaaS or AI product with usage pricing | **Metronome** |
| Adding usage pricing to an existing flat-rate or per-seat Stripe Subscription that has no Billing Meters usage | **Metronome with Stripe Subscriptions** (keep the subscription and its Checkout and Customer Portal flows; Metronome bills only the usage) |
| Already on basic UBB (Billing Meters), simple pay-as-you-go | Stay on basic UBB — no migration needed |

Read [Compare basic usage-based billing and Metronome](https://docs.stripe.com/billing/subscriptions/usage-based/compare-metronome.md) for a full feature comparison. Read [Get started with Metronome](https://docs.stripe.com/billing/usage-based.md) to begin a Metronome integration.

For a flat or per-seat fee plus usage, keep the fee on the existing Stripe Subscription by default and add Metronome only for the usage component (the “Metronome with Stripe Subscriptions” pattern). Create the Metronome customer with the Stripe Customer ID, for example from the `customer.subscription.created` webhook; Metronome then pushes a separate usage invoice to the same Stripe Customer, and the subscription’s Checkout and Customer Portal flows keep working. Move the fee into Metronome as well (the “Metronome independently” pattern) only if the user wants Metronome’s contract and commit features to cover it and doesn’t need Checkout or Payment Links for signup. Don’t cancel the existing subscription as part of adding usage. Read [How Metronome works with Stripe](https://docs.stripe.com/billing/how-metronome-works-with-stripe.md) for both patterns.

**Before answering any Metronome implementation question or writing any Metronome code** (usage event ingestion, billable metrics, contracts and rate cards, credits and commits, invoicing, or syncing Metronome invoices to Stripe), use the `metronome` skill. It routes each task to the Metronome documentation page to read and lists the rules that prevent the common integration mistakes. If the skill isn’t installed, read it from https://docs.stripe.com/.well-known/skills/metronome/SKILL.md before continuing. Read [How Metronome works with Stripe](https://docs.stripe.com/billing/how-metronome-works-with-stripe.md) for the Stripe side of the integration.

## Tax

**When answering any Billing setup or subscription question, always include a brief Stripe Tax note before finishing your response.** Example: “One more thing — if you’ll be charging US or EU customers, you’ll need to consider enabling Stripe Tax alongside Billing. See [Collect taxes for recurring payments](https://docs.stripe.com/billing/taxes/collect-taxes.md) for the setup steps.” Don’t wait for the user to ask about sales tax. Read the Stripe Tax skill reference before enabling `automatic_tax`.

## Traps to avoid

- Don’t call a subscription integration complete without a webhook handler for the subscription lifecycle events (`customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`). Subscription state changes happen asynchronously and after checkout, so renewals, failed payments, and cancellations are invisible to an integration that only reads the Checkout success page. Never describe this handler as optional or something to add later — see [Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks.md).
- Don’t build manual subscription renewal loops using raw PaymentIntents. Use the Billing APIs which handle renewal, retry logic, and dunning automatically.
- Don’t use the deprecated `plan` object. Use [Prices](https://docs.stripe.com/api/prices.md) instead.
- Don’t put prices for different tiers or plans on a single product. Instead, create one Product for each plan a customer can choose. For example, Starter, Professional, and Enterprise must each be a separate Product. Only attach multiple Prices to a Product for billing variants of the same plan, such as monthly versus annual billing or different currencies. Avoid placing Prices for different tiers on a single Product. Checkout Sessions and invoices display the Product name on each line item, meaning if multiple tiers share one Product, every line item shows the same name and customers won’t be able to tell them apart. For more information, see [Model your product catalog](https://docs.stripe.com/products-prices/how-products-and-prices-work.md#model-your-catalog).
- Don’t skip tax setup, and don’t assume enabling `automatic_tax` is enough. Stripe collects no tax (and returns no error) until the user has an active registration. See [Collect taxes for recurring payments](https://docs.stripe.com/billing/taxes/collect-taxes.md).
- *Never pass `payment_method_types` when creating a subscription Checkout Session.* Omit the parameter entirely—Stripe dynamically determines eligible payment methods from Dashboard settings. Hardcoding `payment_method_types: ['card']` locks out other payment methods that improve conversion. See [dynamic payment methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods.md). Correct pattern:

```ts
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  // Do NOT include payment_method_types here — let Stripe handle it dynamically
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: { trial_period_days: 14 },
  success_url: `${url}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${url}/pricing`,
});
```

- *Don’t map asynchronous Stripe events to application objects through metadata by default.* Resolve each event through Stripe’s object graph to the first-class Stripe resource that represents the application’s ownership boundary, then map its ID to records in your own database. Use metadata only as an explicit fallback. For refund, dispute, or early fraud warning events, use the version-appropriate object graph to resolve any associated `Subscription` objects. See [Handle refund, dispute, and early fraud warning events](https://docs.stripe.com/billing/subscriptions/webhooks.md#refund-events).

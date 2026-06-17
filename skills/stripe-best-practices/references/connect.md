# Connect / platforms

## Table of contents

- Accounts v2 API
- Account configuration dimensions
- Business model to configuration mapping
- Charge pattern selection
- Compatibility matrix
- Fee economics
- Connected account configuration
- Onboarding guidance
- Traps to avoid
- Integration guides

## Accounts v2 API

For new Connect platforms, ALWAYS use the [Accounts v2 API](https://docs.stripe.com/connect/accounts-v2.md) (`POST /v2/core/accounts`). This is Stripe's actively invested path and ensures long-term support.

Describe recommendations using explicit field values instead of legacy account-type labels:

- `dashboard` (`express`, `full`, `none`)
- `defaults.responsibilities.fees_collector` (`stripe`, `application`)
- `defaults.responsibilities.losses_collector` (`stripe`, `application`)
- charge pattern (`direct`, `destination`, `separate charges and transfers`)

**Traps to avoid:**

- Do not recommend `type: 'standard' | 'express' | 'custom'` in `POST /v1/accounts` for new integrations unless the user explicitly requests v1.
- Do not describe new integrations only with legacy labels ("Standard", "Express", "Custom"). Use v2 field values.

## Account configuration dimensions

In Accounts v2, configure three independent dimensions:

| Dimension | Field | What it controls |
| --- | --- | --- |
| Dashboard access | `dashboard` | Whether connected accounts get Stripe-hosted dashboard access |
| Fee collection | `defaults.responsibilities.fees_collector` | Who Stripe bills for fees (`stripe` or `application`) |
| Negative balance liability | `defaults.responsibilities.losses_collector` | Who absorbs unresolved negative balances (`stripe` or `application`) |

Default direction by business shape:

- Marketplace-style flow (platform runs checkout): `dashboard: "express"`, `fees_collector: "application"`, `losses_collector: "application"`
- SaaS-style flow (seller runs checkout): `dashboard: "full"`, `fees_collector: "stripe"`, `losses_collector: "stripe"`
- White-label / enterprise control: `dashboard: "none"`, `fees_collector: "application"`, `losses_collector: "application"`

## Business model to configuration mapping

Use this as the primary routing table when a user asks for Connect setup guidance:

| Business model | Dashboard | Fees | Losses | Charge pattern | Why |
| --- | --- | --- | --- | --- | --- |
| Marketplace | `express` | `application` | `application` | Destination | Platform owns checkout and payment operations |
| On-demand services | `express` | `application` | `application` | Destination | Fast seller onboarding, platform-operated checkout |
| Professional services marketplace | `express` | `application` | `application` | Destination | Similar to marketplace flow |
| SaaS platform with payments | `full` | `stripe` | `stripe` | Direct | Sellers are independent merchants of record |
| Crowdfunding | `express` | `application` | `application` | Separate charges and transfers | Flexible split and delayed release flows |
| Subscription platform (platform-run checkout) | `express` | `application` | `application` | Destination | Platform manages recurring checkout flow |
| White-label commerce | `none` | `application` | `application` | Destination or direct | Platform controls UX and operations |
| B2B platform with multi-party allocation | `none` | `application` | `application` | Separate charges and transfers | Complex split and approval workflows |

## Charge pattern selection

Use one charge pattern per primary flow. Only use hybrid patterns when there is a clear need and the user accepts additional operational complexity.

```
How many sellers per transaction?
|- Multiple sellers -> Separate charges and transfers
`- One seller
   |- Seller runs checkout and is merchant of record -> Direct charges
   `- Platform runs checkout and is merchant of record -> Destination charges
```

Detailed rules:

- Choose **destination charges** for the common marketplace flow where the platform owns checkout, customer support, and payment operations.
- Choose **direct charges** when each connected account independently owns the payment relationship and should appear on statements.
- Choose **separate charges and transfers** for hold-and-release timing, delivery-gated payouts, or one payment split across multiple connected accounts.
- Do not describe destination charges as hold-and-release behavior; destination transfers happen automatically when payment succeeds.
- `on_behalf_of` is out of scope for this guide. If required, direct users to [Connect charges docs](https://docs.stripe.com/connect/charges.md) or [Stripe sales](https://stripe.com/contact/sales).

## Compatibility matrix

Validate `(dashboard, fees_collector, losses_collector)` against charge pattern before finalizing a recommendation:

| Dashboard | Fees collector | Losses collector | Direct | Destination | Separate charges and transfers |
| --- | --- | --- | --- | --- | --- |
| `full` | `stripe` | `stripe` | ALLOWED | BLOCKED | BLOCKED |
| `express` | `application` | `application` | ALLOWED | CAUTION | CAUTION |
| `express` | `stripe` | `stripe` | BLOCKED | BLOCKED | BLOCKED |
| `express` | `application` | `stripe` | BLOCKED | BLOCKED | BLOCKED |
| `none` | `stripe` | `stripe` | ALLOWED | BLOCKED | BLOCKED |
| `none` | `application` | `stripe` | ALLOWED | BLOCKED | BLOCKED |
| `none` | `application` | `application` | ALLOWED | ALLOWED | ALLOWED |

Blocked combinations to never recommend:

- `losses_collector: "stripe"` with destination charges or separate charges and transfers
- Express configurations where losses are Stripe-owned (`losses_collector: "stripe"`)
- `application_fee_amount` with separate charges and transfers

Caution combinations:

- `express` + `application` + `application` with destination charges or separate charges and transfers requires platform-run webhook recovery for refunds/disputes and transfer reversals.
- Express dashboards have limited self-service payment-management controls for destination charges and separate charges and transfers; the platform must own operational workflows.

Blessed paths:

| Business shape | Dashboard | Fees | Losses | Charge pattern |
| --- | --- | --- | --- | --- |
| Marketplace | `express` | `application` | `application` | Destination |
| SaaS platform | `full` | `stripe` | `stripe` | Direct |
| Enterprise / white-label | `none` | `application` | `application` | Direct, destination, or separate |

## Fee economics

Who pays Stripe processing fees depends on charge pattern and responsibilities:

| Pattern | Who pays Stripe processing fees | Platform net framing |
| --- | --- | --- |
| Direct charges + `fees_collector: "stripe"` | Connected account | Platform usually keeps full `application_fee_amount` |
| Direct charges + `fees_collector: "application"` | Platform | `application_fee_amount - Stripe_fees` |
| Destination charges | Platform | `application_fee_amount - Stripe_fees` |
| Separate charges and transfers | Platform | `charge_amount - total_transfers - Stripe_fees` |

Guidance:

- For destination charges and separate charges and transfers, do not say "seller pays Stripe fees." Platform economics must account for Stripe fees.
- If margin is low or uncertain, recommend fee logic that preserves margin (for destination flows, include Stripe fee estimates in fee calculation).
- Never use `application_fee_amount` for separate charges and transfers; use transfer-math fee retention.
- Recommend [Platform Pricing Tool](https://dashboard.stripe.com/settings/connect/platform_pricing) when platform-owned pricing is required.
- Advise users to check current region-specific rates at [stripe.com/pricing](https://stripe.com/pricing) and monitor margin reporting.

## Connected account configuration

Match account configuration to charge pattern.

Marketplace-style accounts (destination or separate charges and transfers):

```javascript
const account = await stripe.v2.core.accounts.create({
  dashboard: 'express',
  identity: { country: 'us', entity_type: 'individual' },
  configuration: {
    recipient: {
      capabilities: {
        stripe_balance: { stripe_transfers: { requested: true } },
      },
    },
  },
  defaults: {
    responsibilities: {
      fees_collector: 'application',
      losses_collector: 'application',
    },
  },
});
```

SaaS-style accounts (direct charges):

```javascript
const account = await stripe.v2.core.accounts.create({
  dashboard: 'full',
  identity: { country: 'us', entity_type: 'individual' },
  configuration: {
    merchant: {
      capabilities: {
        card_payments: { requested: true },
      },
    },
  },
  defaults: {
    responsibilities: {
      fees_collector: 'stripe',
      losses_collector: 'stripe',
    },
  },
});
```

Readiness checks before processing payments/transfers:

- Marketplace flow: verify `configuration.recipient.capabilities.stripe_balance.stripe_transfers.status === 'active'` before transferring funds.
- SaaS flow: verify `configuration.merchant.capabilities.card_payments.status === 'active'` before creating direct charges.

## Onboarding guidance

Default to [embedded onboarding](https://docs.stripe.com/connect/embedded-onboarding.md). It reduces compliance burden and keeps users in-app.

Alternative paths:

- Stripe-hosted onboarding is acceptable when embedded UX is not required.
- API-based custom onboarding should be recommended only for advanced teams with dedicated compliance resources.

If users choose `dashboard: "none"` without embedded components, warn that they must build and maintain:

- onboarding and ongoing requirement remediation
- refund and dispute workflows
- payout and earnings management surfaces

## Traps to avoid

- Recommending legacy account types (`standard`, `express`, `custom`) for new integrations
- Recommending Charges API for Connect fund flows instead of PaymentIntents/Checkout
- Using `losses_collector: "stripe"` with destination charges or separate charges and transfers
- Recommending destination charges for hold-and-release payout requirements
- Using `application_fee_amount` with separate charges and transfers
- Ignoring dispute transfer-reversal logic for destination/separate flows
- Recommending OAuth account-connection patterns as the default self-serve onboarding path
- Recommending `on_behalf_of` for standard marketplace flows
- Recommending `dashboard: "none"` without warning about full operational scope

## Integration guides

- [SaaS platforms and marketplaces guide](https://docs.stripe.com/connect/saas-platforms-and-marketplaces.md)
- [Interactive platform guide](https://docs.stripe.com/connect/interactive-platform-guide.md)
- [Design an integration](https://docs.stripe.com/connect/design-an-integration.md)
- [How charges work in Connect](https://docs.stripe.com/connect/charges.md)
- [Connected account configuration (v2)](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration.md)

# Connect / platforms

## Critical rules (never violate)

1. **ALWAYS use Accounts v2 API** (`POST /v2/core/accounts`). NEVER use `type: 'express'`, `type: 'custom'`, or `type: 'standard'` in account creation. NEVER use `stripe.accounts.create({ type: ... })`. These are deprecated v1 patterns. For a live platform that already has v1 connected accounts, see [Existing v1 platforms](#existing-platforms) for how to adopt v2 incrementally.
2. **ALWAYS check v2 capability status** before processing. See “Go-live readiness” section below.
3. **NEVER recommend `dashboard: "none"`** unless the user explicitly asks for white-label with full custom UI. Default to `express` for marketplaces and `full` for SaaS. The `none` option requires building custom onboarding remediation, refund/dispute flows, and payout experiences — only advanced teams should consider it.
4. **ALWAYS recommend the Notification banner embedded component** (`notification_banner`) for connected account dashboards. It keeps accounts healthy as requirements evolve.
5. **NEVER use `application_fee_amount` with separate charges and transfers.** Use transfer-math fee retention instead. `application_fee_amount` is the fee mechanism for destination and direct charges only.

## Go-live readiness

Before processing live payments or transfers, ALWAYS verify capability status using the v2 configuration path. Do NOT use deprecated v1 fields.

**For SaaS / Merchant accounts (direct charges):**

- Check: `configuration.merchant.capabilities.card_payments.status === 'active'`
- Do NOT use: `charges_enabled` (deprecated v1 field)

**For Marketplace / Recipient accounts (destination or separate charges):**

- Check: `configuration.recipient.capabilities.stripe_balance.stripe_transfers.status === 'active'`
- Do NOT use: `payouts_enabled` or `charges_enabled` (deprecated v1 fields)

Track capability state transitions with account webhooks and re-check capability status before payment or transfer operations.

## Account configuration: v2 dimensions

Configure connected accounts using three independent dimensions:

| Dimension | Field | What it controls |
| --- | --- | --- |
| Dashboard access | `dashboard` | Stripe-hosted dashboard for connected accounts |
| Fee collection | `defaults.responsibilities.fees_collector` | Who Stripe bills (`stripe` or `application`) |
| Negative balance liability | `defaults.responsibilities.losses_collector` | Who absorbs unresolved negative balances |

### Dashboard defaults (important)

- **Marketplace** → `dashboard: "express"` — cobranded, lightweight, low maintenance
- **SaaS platform** → `dashboard: "full"` — full Stripe Dashboard for independent businesses
- **White-label (advanced only)** → `dashboard: "none"` — platform must build ALL UX including onboarding remediation, disputes, payouts

If dashboard is `express`, provide access through Dashboard Account Links: create one with the [Account Links v2 API](https://docs.stripe.com/api/v2/core/account-links/create.md), `use_case.type` set to `account_dashboard`, and `use_case.account_dashboard.refresh_url` set to a URL that creates a new link. Generate a new link for each Open Dashboard action. For `full`, recommend linking to Stripe-provided dashboard access from the platform UI, or, to send a `full` dashboard user to their durable dashboard link, you can also create a Dashboard Account Link. These links don’t bypass Stripe authentication. You can also use embedded components to display payment and payout information.

### SaaS vs. Marketplace responsibility defaults

**SaaS (direct charges):**

- `dashboard: "full"`
- `fees_collector: "stripe"` — connected account pays Stripe fees directly
- `losses_collector: "stripe"` — Stripe owns negative balance liability
- Charge pattern: Direct charges (connected account is merchant of record)
- Code sample: [/connect/saas/tasks/create#code-sample](https://docs.stripe.com/connect/saas/tasks/create.md#code-sample)

**Customer-only accounts**: Setting `dashboard` or `defaults.responsibilities` on an account with only the Customer configuration fails with `unsupported_field_for_configs`. If a later update request adds `configuration.merchant` or requests `stripe_balance.stripe_transfers` for `configuration.recipient`, that request must include `dashboard` and `defaults.responsibilities`. You can’t change them after you set them.

**Marketplace (destination charges):**

- `dashboard: "express"`
- `fees_collector: "application"` — platform owns pricing
- `losses_collector: "application"` — platform owns negative balance liability (required for transfer reversals during disputes)
- Charge pattern: Destination charges (platform is merchant of record)
- Code sample: [/connect/marketplace/tasks/create#code-sample](https://docs.stripe.com/connect/marketplace/tasks/create.md#code-sample)

## Business model to configuration mapping

| Business model | Dashboard | Fees | Losses | Charge pattern | Notes |
| --- | --- | --- | --- | --- | --- |
| Marketplace | `express` | `application` | `application` | Destination | Platform owns checkout |
| On-demand services | `express` | `application` | `application` | Destination | Fast seller onboarding |
| SaaS platform with payments | `full` | `stripe` | `stripe` | Direct | Sellers run own businesses/stores, own customer relationship |
| AI/API platform (SaaS) | `full` | `stripe` | `stripe` | Direct | Providers own payment relationship |
| E-commerce enabler (Shopify-like) | `full` | `stripe` | `stripe` | Direct | Sellers create own online stores, accept own payments |
| Crowdfunding | `express` | `application` | `application` | Separate charges and transfers | Hold-and-release / delayed payouts |
| Subscription platform | `express` | `application` | `application` | Destination | Platform manages recurring checkout |
| Multi-seller cart | `express` | `application` | `application` | Separate charges and transfers | Multiple sellers per transaction |
| White-label commerce | `none` | `application` | `application` | Destination or direct | Advanced: platform controls all UX |

## Connected account capabilities (v2)

### Marketplace (Recipient accounts)

Create with `configuration.recipient` requesting `stripe_transfers` on `stripe_balance`. Do NOT request `configuration.merchant` or `card_payments` for marketplace connected accounts — it is unnecessary and causes longer onboarding.

### SaaS (Merchant accounts)

Create with `configuration.merchant` requesting `card_payments` (and other needed LPMs). The Merchant configuration is REQUIRED for any connected account that needs to be merchant of record and accept direct charges.

## Charge pattern selection

**First determine: who owns the customer relationship?**

- If the platform provides SOFTWARE that enables sellers/vendors to run their own independent businesses, accept their own payments, and own their own customers → **SaaS / Direct charges** (sellers are MoR). Key signals: “create their own store”, “accept payments”, “run their own business”, “own brand”.

- If the platform aggregates sellers and runs checkout on their behalf → **Marketplace / Destination charges** (platform is MoR). Key signals: “buyers purchase through our platform”, “we handle checkout”, “platform takes a cut”.

- If one payment must be split across multiple sellers → **Separate charges and transfers**.

- **Direct charges** (SaaS): Charge created on connected account. Connected account is merchant of record. Use `application_fee_amount` for platform revenue. Requires `configuration.merchant` + `dashboard: "full"` + `losses_collector: "stripe"`.

- **Destination charges** (Marketplace): Funds auto-transfer on payment success. Platform is MoR. Use `application_fee_amount` to collect platform fees. NOT for hold-and-release.

- **Separate charges and transfers**: Platform controls transfer timing. Collect fees by transferring less than the charge amount. Do NOT use `application_fee_amount`.

## Fee economics

For **destination charges and direct charges**: use `application_fee_amount` on the PaymentIntent. This is the standard fee mechanism.

- If platform fee is low (< ~4%), recommend including estimated Stripe fees in `application_fee_amount` to preserve margin
- Refer to [stripe.com/pricing](https://stripe.com/pricing) for region-specific rates

For **separate charges and transfers**: collect fees by transferring less than the charge amount. NEVER use `application_fee_amount`.

## Webhooks

Always use webhooks for reliable payment confirmation. Don’t rely solely on synchronous API responses — webhook events are the source of truth for payment status. Verify incoming [webhook signatures](https://docs.stripe.com/webhooks.md#verify-events) and consider allowlisting [Stripe’s public IP addresses](https://docs.stripe.com/ips.md).

## Subscriptions with Connect (v2)

For subscription platforms or any platform collecting recurring payments from or on behalf of connected accounts:

- The connected account MUST have v2 customer configuration
- Pass `customer_account` on SetupIntent and Subscription API calls to associate the subscription with the connected account
- Do NOT create a separate v1 Customer object to bill connected accounts — use the v2 Accounts customer configuration instead

## Embedded components

Always recommend these baseline components:

- `account_onboarding` — onboard connected accounts
- `notification_banner` — REQUIRED: keeps accounts healthy as requirements evolve
- `account_management` — account settings and info

Additional components based on needs:

- Payments/transactions → `payments`
- Payment details → included with `payments` or standalone `payment_details`
- Disputes → included with `payments` or standalone `disputes_list`
- Payouts/earnings → `payouts`
- Reporting → `balance_report`, `payout_reconciliation_report`

## Onboarding

Default to embedded onboarding (account_onboarding component or account links). Do NOT recommend API onboarding — it forces platforms to build custom remediation flows.

## Compatibility constraints

**BLOCKED combinations (never recommend):**

- `losses_collector: "stripe"` with destination charges or separate charges and transfers
- `application_fee_amount` with separate charges and transfers
- Express dashboard with `losses_collector: "stripe"` (API rejection)

**CAUTION:**

- `dashboard: "full"` with destination or separate charges has limited functionality; prefer `dashboard: "express"` for those charge patterns
- Express + destination/separate requires platform-run webhook recovery for disputes and transfer reversals

## Existing v1 platforms 

The v2 rules in this reference apply to new integrations and new connected accounts. For a live platform whose connected accounts were created with v1 account types (`type: 'standard'`, `'express'`, or `'custom'`):

- **Don’t recreate accounts**: Accounts v2 endpoints work with existing v1 accounts without changing them, and v1 endpoints work with accounts created through v2. A newly created v1 account might take up to 10 minutes before it’s available to v2 endpoints. It sends a `v2.core.account.created` event when it’s ready.
- **Migrate in stages**: Use this order: listen for v2 (thin) events on a new endpoint, then move `create` calls to `/v2/core/accounts`, then `update` calls, then `retrieve` calls. Both API versions work during the transition, so you don’t need to switch everything at once. Follow [Use the Accounts v2 API in your existing integration](https://docs.stripe.com/connect/accounts-v2/migrate-integration.md).
- **Keep charge flows as they are**: Destination charges and direct charges reference the connected account by the same `acct_` ID in either API version. On subscriptions, `application_fee_percent` and `transfer_data[destination]` don’t change. The customer reference changes only when you bill a customer-configured account: pass it as `customer_account` instead of `customer`. See [Create subscriptions with Stripe Billing](https://docs.stripe.com/connect/subscriptions.md).
- **Some features still require v1**: These include OAuth, the recipient service agreement, and the `treasury` and `card_issuing_*` capabilities. See the limitations section of the migration guide.
- **Staying on v1 is acceptable**: If the platform doesn’t need v2 features, such as customer-configured accounts or paying the platform from a connected account’s Stripe balance, it can keep its v1 integration. Don’t recommend a rewrite only to replace `type`.

## Traps to avoid

- Using legacy account types (`type: 'standard'`, `type: 'express'`, `type: 'custom'`) — use v2 dimensions instead
- Using `charges_enabled` or `payouts_enabled` — use v2 capability status paths
- Recommending Charges API for Connect — use PaymentIntents or Checkout Sessions
- Recommending `dashboard: "none"` without explicit white-label requirement
- Recommending destination charges for hold-and-release (use separate charges and transfers)
- Recommending `on_behalf_of` for standard marketplace flows
- Creating v1 Customer objects to bill connected accounts (use v2 customer configuration)
- Requesting Merchant configuration / card_payments for marketplace recipient accounts

## Integration guides

- [SaaS platforms and marketplaces guide](https://docs.stripe.com/connect/saas-platforms-and-marketplaces.md) — Choosing the right integration approach.
- [Interactive platform guide](https://docs.stripe.com/connect/interactive-platform-guide.md) — Step-by-step platform builder.
- [Design an integration](https://docs.stripe.com/connect/design-an-integration.md) — Detailed risk and responsibility decisions.
- [Connected account configuration (v2)](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration.md) — Account setup reference.
- [Use the Accounts v2 API in your existing integration](https://docs.stripe.com/connect/accounts-v2/migrate-integration.md) — Incremental migration for platforms with v1 connected accounts.

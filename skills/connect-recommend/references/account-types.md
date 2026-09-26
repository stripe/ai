## Stripe Connect Account Configuration (Accounts v2)

> **IMPORTANT: Use Accounts v2 API**
> 
> Do NOT use the legacy `type` parameter (`standard`, `express`, `custom`) when creating connected accounts. These are v1 terms and are no longer the recommended path. Instead, use the Accounts v2 API (`stripe.v2.core.accounts`) and configure each account along three independent dimensions: **dashboard access**, **fee collection**, and **loss liability**. This gives platforms precise control without being locked into a rigid archetype.

### Account Configuration Dimensions

Accounts v2 replaces the three fixed account types with three independent configuration dimensions. Each dimension is set separately, so platforms can mix and match to fit their exact business model.

#### 1. Dashboard access (`dashboard`)

Controls what connected accounts see when they log in.

| Value | Dashboard access | Use when |
| --- | --- | --- |
| `express` | Lightweight dashboard showing earnings, payouts, and basic tax information. Stripe-branded with platform name. | Marketplace sellers, gig workers, or any connected account that needs visibility but not full Stripe control. |
| `full` | Full, independent Stripe Dashboard. Connected accounts can manage their own settings, view all transactions, and install apps. | SaaS platforms where connected accounts are established businesses that want to operate independently. |
| `none` | No Stripe dashboard. The platform owns the connected-account UI — use **[Embedded Components](https://docs.stripe.com/connect/supported-embedded-components.md)** (`@stripe/connect-js`) for pre-built widgets (account management, payouts, tax forms, and more) or build fully custom. | White-label platforms where connected accounts must never see Stripe branding. Use embedded components for pre-built functionality with white-label feel. **Fully custom (no embedded components)** adds significant complexity — the platform must build and maintain all connected account UX including onboarding remediation, refund and dispute flows, and ongoing requirement collection. |

#### 2. Fee collection (`defaults.responsibilities.fees_collector`)

Determines who is responsible for collecting Stripe processing fees from connected accounts.

| Value | Behavior | Use when |
| --- | --- | --- |
| `stripe` | Stripe bills connected accounts directly for processing fees. The platform doesn’t need to handle fee logistics. | Most platforms. Simpler to operate. Connected accounts see Stripe fees on their own statements. |
| `application` | The platform is responsible for collecting fees from connected accounts and remitting them to Stripe. The platform receives a single invoice from Stripe. | Enterprise or white-label platforms that want full control over billing relationships, or that bundle Stripe fees into their own pricing. |

> **Fee collection behavior depends on charge type.** The `fees_collector` setting interacts with the charge pattern:
> 
> - **Direct charges:** `fees_collector` determines who pays Stripe processing fees. With `fees_collector: "stripe"`, the connected account pays fees directly. The `fee_payer` parameter can further control this — see [direct charges fee payer behavior](https://docs.stripe.com/connect/direct-charges-fee-payer-behavior.md).
> - **Destination charges and separate charges and transfers:** The platform always pays Stripe processing fees regardless of the `fees_collector` setting, because the charge lives on the platform account. The `fees_collector` setting in these cases governs the platform-level billing relationship with Stripe (single invoice vs per-account), not per-transaction fee deduction.

#### 3. Loss liability (`defaults.responsibilities.losses_collector`)

Determines who bears financial responsibility for negative balances, disputes, and refunds on connected account activity.

| Value | Behavior | Use when |
| --- | --- | --- |
| `stripe` | Stripe bears financial responsibility for negative balances on connected accounts that remain unresolved (for example, from disputes or fraud). | Most platforms. Reduces financial risk from unrecoverable negative balances. |
| `application` | The platform bears losses from unresolved negative balances, and is responsible for managing disputes. | Platforms with sophisticated risk management, high-risk verticals, or those that want to internalize loss economics for better unit economics. |

### Common Configurations

| Business Shape | Dashboard | Fees Collector | Losses Collector | Notes |
| --- | --- | --- | --- | --- |
| **Marketplace** | `express` | `application` | `application` | Platform owns fees and losses. Sellers get a lightweight dashboard. Required for Express dashboard + destination charges. Common for two-sided marketplace models. |
| **Self-serve SaaS (SES)** | `express` | `stripe` | `stripe` | **Public preview.** Low-operations default for self-serve SaaS platforms using direct charges: Stripe-managed pricing and Stripe-managed negative balance liability, with a lightweight Express dashboard for connected accounts. |
| **Self-serve SaaS (PES)** | `express` | `application` | `stripe` | **Public preview.** For self-serve SaaS platforms using direct charges that want to control their own pricing (using the Platform Pricing Tool) while keeping Stripe-managed negative balance liability. |
| **SaaS enabling payments (established merchants)** | `full` | `stripe` | `stripe` | Connected accounts are independent businesses that need full, independent Stripe operations, with their own full Stripe Dashboard. Platform collects revenue through application fees. **Use direct charges only** — other charge types with `losses_collector: 'stripe'` cause the platform to silently carry negative balance liabilities. |
| **White-label / enterprise** | `none` | `application` | `application` | Platform owns the entire connected-account UI. No Stripe branding. Platform manages all billing and risk. Full control with higher operational responsibility. Compatible with all charge types. |
| **Managed marketplace** | `express` | `application` | `application` | Platform wants seller-facing dashboard and also owns risk. Express dashboard requires platform to own both fees and losses. Compatible with all charge types — destination and separate charges require webhook-driven recovery flows for refunds and disputes (CAUTION: connected accounts have limited dispute and refund visibility from their dashboard). |

#### Configuration Compatibility Warnings

> **CRITICAL: `losses_collector: 'stripe'` restricts you to direct charges only — but only when `dashboard: "full"` or `dashboard: "express"` (public preview).**
> 
> For `dashboard: "none"`, the only allowed path is `fees_collector: 'application'` + `losses_collector: 'application'`. All other responsibility combinations with `none` are BLOCKED, including direct charges with Stripe-owned responsibilities.
> 
> When Stripe owns loss liability but the platform uses destination charges, separate charges and transfers, or `on_behalf_of` variants, the liability model doesn’t align with how these charge flows are debited and recovered. See `compatibility-matrix.md` for the full compatibility matrix.

Key rules:

- **Express dashboard with non-direct charges** requires `fees_collector: 'application'` AND `losses_collector: 'application'`. For **direct** charges, Express dashboard also supports Stripe-managed negative balance liability (`losses_collector: "stripe"`) as a public-preview capability, with either `fees_collector: "stripe"` (SES) or `fees_collector: "application"` (PES).
- **`losses_collector: 'stripe'` + destination charges or separate charges and transfers** = BLOCKED. Platform silently inherits negative balance liability, fees are misattributed, and connected accounts can’t manage refunds or disputes from their dashboard.
- **`losses_collector: 'application'`** is compatible with all charge types when `fees_collector` is also `'application'`, with one exception: `full` dashboard + `application/application` is SALES-GATED (redirect to [Stripe sales](https://stripe.com/contact/sales)). With `fees_collector: 'stripe'` (full or none dashboard), all charge types are BLOCKED.
- **`dashboard: "full"` + `fees_collector: "application"`** = SALES-GATED. Do NOT recommend for self-serve paths. Redirect to [Stripe sales](https://stripe.com/contact/sales).
- **`dashboard: "express"` + `losses_collector: "stripe"` + direct charges** (SES/PES) = ALLOWED as a public-preview path for self-serve SaaS platforms. Always disclose the public-preview status. Non-direct charge patterns with this combination remain BLOCKED.

### v2 API Example

Create a connected account using Accounts v2:

**Marketplace connected account (destination charges or separate charges and transfers):**

```javascript
const account = await stripe.v2.core.accounts.create({
  contact_email: 'seller@example.com',
  display_name: 'Seller Name',
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
    currency: 'usd',
    responsibilities: {
      fees_collector: 'application',
      losses_collector: 'application',
    },
  },
});
```

**Self-serve SaaS connected account (direct charges, SES — public preview):**

> **Requires the current Connect preview API version.** `dashboard: 'express'` combined with `losses_collector: 'stripe'` (SES/PES) is only available on the current Connect preview API version, not on a pinned GA API version. Check the [preview changelog](https://docs.stripe.com/changelog.md?preview=true) for the exact version string, and pass it explicitly (for example, using the `apiVersion` request option) rather than relying on the platform’s account-level pinned version — otherwise account creation is rejected.

```javascript
const account = await stripe.v2.core.accounts.create(
  {
    contact_email: 'merchant@example.com',
    display_name: 'Merchant Name',
    dashboard: 'express',
    identity: { country: 'us', entity_type: 'individual' },
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
    },
    defaults: {
      currency: 'usd',
      responsibilities: {
        fees_collector: 'stripe',
        losses_collector: 'stripe',
      },
    },
  },
  {
    // Required: dashboard: 'express' + losses_collector: 'stripe' (SES/PES) is only
    // available on the current Connect preview API version. Look up the exact
    // version at https://docs.stripe.com/changelog?preview=true — this call fails
    // on a pinned GA API version.
    apiVersion: '<current-connect-preview-api-version>',
  },
);
```

This SES configuration (Express dashboard + Stripe-managed pricing + Stripe-managed negative balance liability, with direct charges) is the low-operations default for self-serve SaaS platforms and is currently in public preview, requiring the current Connect preview API version shown above. For a self-serve SaaS platform that wants pricing control instead, use the PES variant: same `dashboard: 'express'`, `losses_collector: 'stripe'`, and preview API version requirement, but set `fees_collector: 'application'` and configure pricing with the [Platform Pricing Tool](https://dashboard.stripe.com/settings/connect/platform_pricing).

**SaaS connected account for established merchants needing independent Stripe operations (direct charges, full dashboard):**

```javascript
const account = await stripe.v2.core.accounts.create({
  contact_email: 'merchant@example.com',
  display_name: 'Merchant Name',
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
    currency: 'usd',
    responsibilities: {
      fees_collector: 'stripe',
      losses_collector: 'stripe',
    },
  },
});
```

Key points about this API:

- **`dashboard`** is set at the top level, not inside configuration.
- **`identity.country`** and **`identity.entity_type`** replace the old `country` and `business_type` fields.
- For marketplace connected accounts: use `configuration.recipient` with `stripe_balance.stripe_transfers` — do NOT request `configuration.merchant` or `card_payments` (unnecessary and causes longer onboarding).
- For SaaS connected accounts: use `configuration.merchant` with `card_payments` — the connected account is merchant of record (that is, direct charges where the connected account’s name appears on customer bank statements).
- **`defaults.responsibilities`** is where you set fee and loss liability. These are the v2 replacements for what was previously implied by account type.
- **`defaults.currency`** sets the default settlement currency.

#### Merchant Configuration (Required for Merchant of Record)

> **For SaaS or direct charges only.** Marketplace connected accounts should use `configuration.recipient` instead — see example above.

In Accounts v2, the `configuration.merchant` block is what makes a connected account capable of accepting payments as the merchant of record. This is required when using **direct charges** (where the charge is created on the connected account and their business name appears on customer bank statements).

Without the Merchant configuration, the connected account can’t process payments directly — it can only receive transfers from the platform.

```javascript
configuration: {
  merchant: {
    capabilities: {
      card_payments: { requested: true },
    },
  },
},
```

**When to include Merchant configuration:**

- **Direct charges** — REQUIRED. The connected account is the merchant of record.
- **Destination charges** — NOT needed. Use `configuration.recipient` with `stripe_transfers` instead. Requesting `configuration.merchant` or `card_payments` for marketplace accounts is unnecessary and causes longer onboarding.
- **Separate charges & transfers** — NOT needed. Use `configuration.recipient` with `stripe_transfers` instead.

### Decision Guide

**Choose `dashboard: 'express'` when…**

- You are building a marketplace or on-demand platform
- Connected accounts need to see their earnings and payout history
- You want Stripe to host the seller dashboard so you can focus on your product
- You want fast onboarding with Stripe-hosted flows

**Choose `dashboard: 'full'` when…**

- Connected accounts are established businesses that expect a full payments dashboard
- You are a SaaS platform where merchants operate independently
- Connected accounts may want to install Stripe apps or manage their own settings
- Sellers already have or expect to have their own Stripe relationship

**Choose `dashboard: 'none'` when…**

- You need a fully white-labeled UI with no Stripe branding
- Connected accounts should never interact with a Stripe-hosted dashboard
- The platform wants to take on more responsibility: must support ongoing requirement collection, and refund and dispute flows (can use embedded components)
- **Fully custom (no embedded components)** adds significant complexity — the platform must build and maintain all connected account UX including onboarding remediation, refund and dispute flows, and ongoing requirement collection

**Choose `losses_collector: 'stripe'` when…**

- You want Stripe to bear financial responsibility for unresolved negative balances on connected accounts
- You are starting out and want to minimize financial risk
- You don’t have a dedicated risk or fraud operations team
- You plan to use direct charges

**Choose `losses_collector: 'application'` when…**

- You have a mature risk management operation
- You want to internalize loss economics (for example, you believe your fraud rate is low enough to profit from self-insuring)
- You operate in a vertical where you have better risk signal than Stripe
- You need full control over dispute response workflows
- You plan to use destination charges or separate charges and transfers, and on_behalf_of isn’t used

**Choose `fees_collector: 'stripe'` when…**

- You want the simplest operational model
- You are fine with Stripe billing connected accounts directly
- You don’t want to manage fee invoicing or reconciliation

**Choose `fees_collector: 'application'` when…**

- You want to control the entire billing relationship with connected accounts
- You bundle Stripe processing fees into your own platform pricing
- You need consolidated invoicing from Stripe to your platform

### Legacy Migration Note

The terms **Standard**, **Express**, and **Custom** refer to the v1 Accounts API and its `type` parameter. They are no longer the recommended way to create connected accounts. Here is how they roughly map to v2 dimensions:

| Legacy v1 Type | Approximate v2 Equivalent |
| --- | --- |
| Standard | `dashboard: 'full'`, `fees_collector: 'stripe'`, `losses_collector: 'stripe'` |
| Express | `dashboard: 'express'`, `fees_collector: 'application'`, `losses_collector: 'application'` |
| Custom | `dashboard: 'none'`, `fees_collector: 'application'`, `losses_collector: 'application'` |

The mapping is approximate because legacy types have behavioral nuances that don’t carry over to their explicit-field “equivalents.” For example, the fee payer behavior in the approximate configuration equivalent differs from what the legacy type provided. The legacy Express approximation remains `dashboard: 'express'` + `fees_collector: 'application'` + `losses_collector: 'application'`. The Accounts v1 and v2 APIs both expose explicit fields for additional combinations, including an Express dashboard with Stripe responsible for connected-account negative balances on direct charges (SES/PES, public preview), but those combinations don’t correspond to a legacy `type` value.

Stripe docs also expose legacy fee-payer variants for direct charges:

| Legacy fee-payer value (docs) | Meaning |
| --- | --- |
| `application_express` | Historical billing behavior for legacy Express accounts |
| `application_custom` | Historical billing behavior for legacy Custom accounts |

These are external Stripe-doc terms tied to legacy account behavior. For new integrations, use Accounts v2 responsibilities (`fees_collector`, `losses_collector`) instead.

Don’t treat this table as “these are the same thing.” It is a rough conceptual guide. Legacy accounts retain their original behaviors; v1 and v2 coexist. All new integrations should use v2.

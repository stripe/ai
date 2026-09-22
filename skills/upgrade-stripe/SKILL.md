---
name: upgrade-stripe
description: Guide for upgrading Stripe API versions and SDKs

---

# Upgrading Stripe Versions

This guide covers upgrading Stripe API versions, server-side SDKs, Stripe.js, and mobile SDKs.

## Choose a target API version

If the user specifies a target API version, use it. Otherwise, look up the current version on docs.stripe.com with any documentation or web tool available to you, for example `stripe docs /api/versioning` with the Stripe CLI. The [API versioning](https://docs.stripe.com/api/versioning.md) page states it in the sentence that begins “The current version is”.

Bundled fallback API version: `2026-08-26.dahlia`. This value is only a snapshot from the last time this skill was generated, on 2026-09-22. Version identifiers start with their release date in YYYY-MM-DD format and new stable versions are released monthly, so a fallback version dated more than a month ago is probably stale. Use it only when you can’t reach docs.stripe.com. Never guess about a newer version number.

Before making changes, compare the target with each API version the integration pins: client configuration, per-request overrides, and webhook endpoints. Unless the user explicitly asks for it, don’t move any pin to an older version or a stable pin to a preview version. If a pin already matches the target, report it as unchanged. State the selected target and its source. If live verification fails or is unavailable, say that the latest version remains unverified, and don’t claim the integration is on the latest version.

For SDKs that support explicit API version overrides, use the selected target in client configuration and per-request overrides. Use it in curl `Stripe-Version` test headers, too. Replace bundled API versions shown in those examples with the selected target before copying or running them. For Java, Go, and .NET, select an SDK release that targets the selected API version instead of overriding the SDK’s fixed version. Preview targets need the matching `beta` SDK release in every language; see [SDK versioning](https://docs.stripe.com/sdks/versioning.md).

## Understanding Stripe API Versioning

Stripe uses date-based API versions (e.g., `2026-08-26.dahlia`, `2025-08-27.basil`, `2024-12-18.acacia`). Your account’s API version determines request/response behavior.

### Types of Changes

**Backward-Compatible Changes** (don’t require code updates):

- New API resources
- New optional request parameters
- New properties in existing responses
- Changes to opaque string lengths (e.g., object IDs)
- New webhook event types

**Breaking Changes** (require code updates):

- Field renames or removals
- Behavioral modifications
- Removed endpoints or parameters

Review the [API Changelog](https://docs.stripe.com/changelog.md) for all changes between versions.

## Server-Side SDK Versioning

See [SDK Version Management](https://docs.stripe.com/sdks/set-version.md) for details.

### Dynamically-Typed Languages (Ruby, Python, PHP, Node.js)

These SDKs offer flexible version control:

**Global Configuration:**

```python
import stripe
stripe.api_version = '2026-08-26.dahlia'
```

```ruby
Stripe.api_version = '2026-08-26.dahlia'
```

```javascript
const stripe = require('stripe')('sk_test_xxx', {
  apiVersion: '2026-08-26.dahlia'
});
```

**Per-Request Override:**

```python
stripe.Customer.create(
  email="customer@example.com",
  stripe_version='2026-08-26.dahlia'
)
```

### Strongly-Typed Languages (Java, Go, .NET)

These use a fixed API version matching the SDK release date. Don’t set a different API version for strongly-typed languages because response objects might not match the strong types in the SDK. Instead, update the SDK to target a new API version.

### Best Practice

Always specify the API version you’re integrating against in your code instead of relying on your account’s default API version:

```javascript
// Good: Explicit version
const stripe = require('stripe')('sk_test_xxx', {
  apiVersion: '2026-08-26.dahlia'
});

// Avoid: Relying on account default
const stripe = require('stripe')('sk_test_xxx');
```

## Stripe.js Versioning

See [Stripe.js Versioning](https://docs.stripe.com/sdks/stripejs-versioning.md) for details.

Stripe.js uses an evergreen model with major releases (Acacia, Basil, Clover, Dahlia) on a biannual basis.

### Loading Versioned Stripe.js

**Via Script Tag:**

```html
<script src="https://js.stripe.com/dahlia/stripe.js"></script>
```

**Via npm:**

```bash
npm install @stripe/stripe-js
```

Major npm versions correspond to specific Stripe.js versions.

### API Version Pairing

Each Stripe.js version automatically pairs with its corresponding API version. For instance:

- Dahlia Stripe.js uses `2026-08-26.dahlia` API
- Acacia Stripe.js uses `2024-12-18.acacia` API

You can’t override this association.

### Migrating from v3

1. Identify your current API version in code
2. Review the changelog for relevant changes
3. Consider gradually updating your API version before switching Stripe.js versions
4. Stripe continues supporting v3 indefinitely

## Mobile SDK Versioning

See [Mobile SDK Versioning](https://docs.stripe.com/sdks/mobile-sdk-versioning.md) for details.

### iOS and Android SDKs

Both platforms follow **semantic versioning** (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking API changes
- **MINOR**: New functionality (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

New features and fixes release only on the latest major version. Upgrade regularly to access improvements.

### React Native SDK

Uses a different model (0.x.y schema):

- **Minor version changes** (x): Breaking changes AND new features
- **Patch updates** (y): Critical bug fixes only

### Backend Compatibility

All mobile SDKs work with any Stripe API version you use on your backend unless documentation specifies otherwise.

## Upgrade Checklist

1. Review the [API Changelog](https://docs.stripe.com/changelog.md) for changes between your current and target versions
2. Check [Upgrades Guide](https://docs.stripe.com/upgrades.md) for migration guidance
3. Update server-side SDK package version (e.g., `npm update stripe`, `pip install --upgrade stripe`)
4. Update the `apiVersion` parameter in your Stripe client initialization
5. Test your integration against the new API version using the `Stripe-Version` header
6. Update webhook handlers to handle new event structures
7. Update Stripe.js script tag or npm package version if needed
8. Update mobile SDK versions in your package manager if needed
9. Store Stripe object IDs in databases that accommodate up to 255 characters (case-sensitive collation)

## Testing API Version Changes

Use the `Stripe-Version` header to test your code against a new version without changing your default:

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_test_xxx: \
  -H "Stripe-Version: 2026-08-26.dahlia"
```

Or in code:

```javascript
const stripe = require('stripe')('sk_test_xxx', {
  apiVersion: '2026-08-26.dahlia'  // Test with new version
});
```

## Important Notes

- Your webhook listener should handle unfamiliar event types gracefully
- Test webhooks with the new version structure before upgrading
- Breaking changes are tagged by affected product areas (Payments, Billing, Connect, etc.)
- Multiple API versions coexist simultaneously, enabling staged adoption

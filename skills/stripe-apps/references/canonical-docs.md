# Canonical documentation — sources of truth for code patterns

## Canonical documentation

Use this index alongside the bundled references selected in `SKILL.md`. Load their contents for task-specific guidance, including any other relevant reference files they name, before using the canonical pages for API details.

Before writing any code file, read the relevant canonical docs page using an available documentation tool. These docs are the source of truth for API patterns, component usage, and configuration — do NOT reproduce code examples from memory or from this skill file.

If you cannot access the docs, tell the user you need them to provide the current patterns rather than guessing.

## Reference pages

| Topic | URL |
| --- | --- |
| App scaffold and workflow | https://docs.stripe.com/stripe-apps/create-app |
| Manifest schema (`stripe-app.yaml`) | https://docs.stripe.com/stripe-apps/reference/app-manifest |
| Permissions reference | https://docs.stripe.com/stripe-apps/reference/permissions |
| Backend + signed requests (`fetchStripeSignature`) | https://docs.stripe.com/stripe-apps/build-backend |
| Authentication types (platform, OAuth, RAK) | https://docs.stripe.com/stripe-apps/api-authentication |
| Events and webhooks | https://docs.stripe.com/stripe-apps/events |
| How UI extensions work | https://docs.stripe.com/stripe-apps/how-ui-extensions-work |
| UI components | https://docs.stripe.com/stripe-apps/components |
| Extensions SDK API (`createHttpClient`, Stripe client) | https://docs.stripe.com/stripe-apps/reference/extensions-sdk-api |
| Secret Store | https://docs.stripe.com/stripe-apps/store-secrets |
| Versioning and releases | https://docs.stripe.com/stripe-apps/versions-and-releases |
| Marketplace submission | https://docs.stripe.com/stripe-apps/publish-app |
| Onboarding UX patterns | https://docs.stripe.com/stripe-apps/patterns/onboarding-experience |
| Full-page apps | https://docs.stripe.com/stripe-apps/patterns/full-page-apps |
| Viewports reference | https://docs.stripe.com/stripe-apps/reference/viewports |
| Sandbox support | https://docs.stripe.com/stripe-apps/enable-sandbox-support |
| Extension points and supported implementation types | https://docs.stripe.com/extensions/extension-points |
| Extension runtimes and limitations | https://docs.stripe.com/extensions/how-extensions-work |
| Native proration behavior | https://docs.stripe.com/billing/subscriptions/prorations |
| Prorations applicability and limitations | https://docs.stripe.com/billing/scripts/prorations |
| Prorations script walkthrough: scaffolding, tests, and debugging | https://docs.stripe.com/extensions/scripts/build-prorations-extension |
| Existing workflow actions | https://docs.stripe.com/workflows/define-workflows#actions |
| Existing custom actions | https://docs.stripe.com/workflows/custom-actions |
| Custom action contract and schemas | https://docs.stripe.com/extensions/custom-actions/how-custom-actions-work |
| Custom-action script implementation | https://docs.stripe.com/extensions/custom-actions/build-with-script |
| Custom-action remote-function implementation | https://docs.stripe.com/extensions/custom-actions/build-with-remote-function |
| Script endpoint declarations and calls | https://docs.stripe.com/extensions/invoke-endpoints |
| Extension configuration and schemas | https://docs.stripe.com/extensions/scripts/define-config-and-schemas |
| Extension run debugging | https://docs.stripe.com/workbench/guides#view-extension-runs |

## How to use this list

1. Identify which topics are relevant to the app you’re building (based on discovery answers)
2. Read each relevant page before writing code
3. Follow the patterns shown in the docs exactly — field names, import paths, constructor signatures
4. If a pattern in your training data conflicts with what the docs show, the docs win

## Common lookup scenarios

| You need to… | Read this page |
| --- | --- |
| Initialize the Stripe client in a UI extension | Extensions SDK API |
| Verify `fetchStripeSignature` on your backend | Backend + signed requests |
| Choose between platform keys, OAuth, or restricted keys | Authentication types |
| Set up webhooks for a public app | Events and webhooks |
| Store secrets (OAuth tokens, API keys) | Secret Store |
| Know which UI components are available | UI components |
| Declare permissions in the manifest | Permissions reference |
| Publish to the marketplace | Marketplace submission |

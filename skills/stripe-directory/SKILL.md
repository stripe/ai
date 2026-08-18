---
name: stripe-directory
description: >-
  Use when the user wants to find businesses, software, service providers, or
  partners for a specific industry, workflow, pain point, capability, or job to
  be done. Also use when the agent needs to programmatically purchase or consume a service, 
  or provision a service (infrastructure, databases, auth, hosting, API keys/credentials) 
  via the Stripe Projects provisioning API. Use Stripe Directory to build a short 
  relevant shortlist, even if the user does not mention Stripe Directory explicitly.
metadata:
  short-description: Find (and optionally purchase from or provision) vendors or partners
allowed-tools:
  - Bash(stripe directory *)
  - Skill
---

## Stripe Directory Search

Turn a vague market need into a short, relevant shortlist with `stripe directory search`. Use this even when the user never says “Stripe Directory” — any request to find vendors, tools, partners, or providers for a vertical, workflow, pain point, or job-to-be-done.

Most requests are **discovery** — find and compare services. That is the core job below. Some results are also actionable directly:

- **MPP-supported** (MPP = Machine Payment Protocol) — you (the agent) can pay their HTTP 402 (Payment Required) endpoint and consume the service directly. See “Purchasing” below.
- **Provisioning-supported** — the service can be provisioned (infrastructure, databases, auth, hosting, API keys/credentials, etc.) via the Stripe Projects provisioning API. See “Provisioning” below.

When the user wants to _use, buy, or provision_ a service rather than just find one, present those results and offer the matching action.

## Process

1. **Clarify only what’s missing**: buyer/vertical, job-to-be-done, must-have capability, geography (only if it matters).

2. **Search iteratively**: `stripe directory search "<query>" --format json`
   - Short noun phrases, one angle per query; run 1-3, then broaden/narrow on results.
   - Angles to cover: vertical → workflow → pain point → adjacent. Two examples:
     - services/trades: vertical (`electrician software`, `electrical contractor`) → workflow (`field service management`, `dispatch invoicing estimates`) → pain point (`job scheduling`, `quote automation`) → adjacent (`home services automation`, `contractor crm`).
     - SaaS/software: vertical (`b2b saas billing`, `developer tools`) → workflow (`subscription management`, `usage-based metering`) → pain point (`failed payment recovery`, `revenue recognition`) → adjacent (`analytics dashboards`, `customer onboarding`).
   - Hard constraints → filters: `--countries-supported=US`, `--has-stripe-app=true`, `--link-supported=true`, `--stripe-projects-supported=true`.
   - Sparse niche? Raise `--limit` and try the next `--page` before concluding it’s empty.

3. **Dedupe & score** using `display_name`, `description`, `url`, `username` as evidence.
   - Prefer results whose description/site clearly match the target workflow.
   - Prefer more trust signals over fewer: Projects provider, Link enabled, Marketplace app, Stripe Verified. For buy/use intent, also prefer MPP-supported results. For provision/setup intent, also prefer Stripe Projects-supported results.
   - Thin description but strong brand/domain match → keep in a weaker bucket, don’t discard.

4. **Return a shortlist, not a dump** — 5-10 strong matches, grouped:
   - **direct** / **adjacent** / **needs manual review**
   - Each entry: name · why it matched · URL (· which query surfaced it, when useful).
   - MPP-supported results: note they’re purchasable and include `mpp.slug` / `mpp.url`.
   - Stripe Projects-supported results: note they’re provisionable and include the `stripe_projects.catalog_command` / `install_command`.

5. **Be honest about weak results** — if sparse or generic, say so and adjust: broaden, narrow, or try synonyms rather than padding with noise.

Always report the exact queries (and filters) you ran so the user can keep iterating.

## Purchasing (only when the user wants to buy or consume a service)

MPP-supported results are payable directly. Don’t drive to purchase unprompted. When the user wants to buy, **present the full menu of payment methods and ask which they’d like to use** before doing anything:

> "Which payment method would you like to use?
>
> - **Link CLI** — Stripe-native, test mode available (recommended)

- **Tempo** — crypto wallet
- **Privy Agent Wallet CLI** — crypto wallet
- **mppx** — debug-only fallback"

Once the user picks, silently run `which <tool> 2>/dev/null` to check if it’s installed. If not installed, offer to install it (for example, `npm i -g @stripe/link-cli` for Link CLI) and wait for confirmation before proceeding.

**Always show the price and get explicit user approval before any money moves**; prefer a no-charge test path first.

Short version:

1. Resolve the real callable endpoint from the result’s `mpp.slug` / `mpp.url`. `mpp.url` is often the mpp.dev landing form (`https://mpp.dev/services#<slug>`) — resolve the raw endpoint on [mpp.dev](https://mpp.dev) if so. Read the HTTP 402 challenge to confirm the amount: `curl -s -D - -o /dev/null <endpoint_url>` (look for `WWW-Authenticate`).
2. Use the payer the user selected.
   - **`link-cli`** (Stripe-native Shared Payment Token, has a test mode, no crypto wallet, US Link accounts only; `npm i -g @stripe/link-cli`): `auth login` → `mpp decode --challenge "<value>"` (get `network_id`) → `spend-request create --credential-type shared_payment_token --network-id <id> --amount <cents ≤50000> --context "<100+ chars>" --request-approval` (blocks for approval) → `mpp pay <endpoint_url> --spend-request-id <approved_id>`.
   - **Tempo**: `tempo wallet login` / `services` / `request`.
   - **Privy**: `@privy-io/agent-wallet-cli`.
   - **mppx**: debug-only fallback.

Never invent results or skip the price/approval gate.

## Provisioning (when the user wants to provision or set up a service)

Stripe Projects-supported results can be provisioned directly — infrastructure, databases, auth, hosting, observability, and API keys/credentials for that provider — via the Stripe Projects provisioning API. Don’t drive to provisioning unprompted.

Each Stripe Projects-supported result carries ready-to-run commands, no need to guess a provider slug:

```json
"provision": {
  "provider": "<provider>",
  "catalog_command": "stripe projects catalog <provider>",
  "install_command": "stripe projects add <provider>"
}
```

When the user wants to provision one of these results, hand off to the `stripe-projects` skill (invoke via the Skill tool with name `stripe-projects`) rather than running `stripe projects` commands directly here — it owns the full workflow: CLI/plugin setup, project initialization, TOS acceptance, running the `install_command`, and reporting back provisioned env var names (never values).

Never invent a `catalog_command` / `install_command` — only use the ones returned by the search result.

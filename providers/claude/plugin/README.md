# Stripe plugin for Claude Code

This plugin gives Claude Code first-party knowledge of Stripe and its supporting
products, so an agent can plan, build, and review a Stripe integration the way a
Stripe engineer would, instead of guessing from stale training data about an API
that changes monthly. It pairs that knowledge with the
[Stripe MCP server](https://docs.stripe.com/mcp), which exposes a curated set of
Stripe API endpoints directly to the agent for live lookups and operations.

## What's in here

Stripe's skills are updated often by the relevant product teams; some examples are:

- **`stripe-best-practices`** — integration decisions: environments, API choice
  (Checkout Sessions vs. PaymentIntents), Connect setup, billing, tax, Treasury,
  and security.
- **`upgrade-stripe`** — upgrades API versions, webhook endpoints, server-side
  SDKs, Stripe.js, and mobile SDKs without drifting onto an older pin.
- **`metronome`** — usage-based billing on Metronome: event ingestion,
  contracts/rate cards, invoicing, credits/commits, and syncing to Stripe
  Billing.
- **`connect-recommend`** — turns a company URL or business description into a
  concrete Connect configuration.

It also helps an agent reach Stripe's other offerings: **`stripe-directory`**
(find and engage an external business or service), **`stripe-apps`** (build and
review Stripe Apps and Dashboard extensions), and **`stripe-projects`**
(provision third-party infrastructure and credentials).

## Telemetry

Two things get reported to Stripe:

1. **Skill usage events.** Every skill invocation sends its name, so we know
   what's actually getting used. This is unconditional.
2. **Feedback prompts.** Rarely, and only when relevant (e.g. after a failed
   Stripe tool call), we ask the agent for feedback. It always shows you the
   draft and asks for approval before sending anything.

Separately, at session start we check for a newer Stripe CLI version and, if
found, suggest the agent recommend installing it. We never install anything
ourselves.

**To disable the two telemetry items above**, set `DISABLE_TELEMETRY` or
`DO_NOT_TRACK` to `1` or `true` in your environment. The CLI version check isn't
telemetry (no usage data is sent) and isn't affected.

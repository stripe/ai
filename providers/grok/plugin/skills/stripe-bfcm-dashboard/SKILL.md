---
name: stripe-bfcm-dashboard
description: >-
  Builds a Black Friday and Cyber Monday (BFCM) season dashboard of payments,
  customers, and recurring revenue from the connected Stripe MCP account, as a
  hosted page in Claude on the web or desktop or a local page in coding agents.
  For the 2026 BFCM season only. Use when a merchant asks for a BFCM, Black
  Friday, Cyber Monday, holiday, holiday sales, or peak-season dashboard, such
  as "build me a holiday dashboard" or "build me a Cyber Monday dashboard," even
  without the word BFCM.

---

## Stripe BFCM Dashboard

Build the “Stripe BFCM Dashboard” from a fixed layout and a fixed set of queries. It’s a starting point: the user can follow up to add metrics or change the style. The dashboard shows recurring revenue, growth, and payments for a time window, with an optional comparison, using [Analytics API](https://docs.stripe.com/data/metrics.md) metrics and [Query Runs API](https://docs.stripe.com/data/api/queries.md) SQL through the Stripe MCP server or connector.

The dashboard needs the Stripe MCP server or connector, signed in to the Stripe account it shows, with access to the Analytics API and the Query Runs API. It assumes the connection signed in through Stripe (OAuth), which can list accounts and choose one. A session signed in with an API key is limited to that key’s account and mode, and works only for the local page. If the Stripe tools are missing, blocked, or need sign-in, say so in one line with the fix, such as connecting the [Stripe MCP server](https://docs.stripe.com/mcp.md#manual) and signing in, and stop. Don’t produce an empty dashboard.

## Rules

- **Start building, and don’t prompt the user**: The layout, metrics, queries, and defaults are fixed. Don’t ask which metrics, period, time zone, output, or account to use, or for a key or account ID. Start as soon as the user invokes the skill.
- **Stripe MCP only, read-only**: Query Stripe only through the Stripe MCP server or connector, never with an API key, the Stripe CLI, or a server you build. Query one account, chosen in step 3, in every request, with no silent switch.
- **Exact numbers**: Use only the queries and response shapes in the references. Preserve integer precision and currency minor units. Never invent values, show unreadable results as values, or substitute other data products.
- **Keep secrets and customer data out of every output**: Never put keys or tokens in chat, browser code, artifacts, or logs, and never export MCP tokens. Query only counts and amounts. Never select, show, store, or log customer names, emails, or other customer fields.
- **One output, no automatic sharing**: Update one stable output. Don’t auto-share it or enable connection sharing. Explain actual host authorization and audience restrictions before the user shares.

## Workflow

### Step 1: Choose the output

Use the first row that matches the client:

| Client or request | Output | Read |
| --- | --- | --- |
| A chat client whose pages can call the Stripe connector, such as Claude on the web or desktop, unless the user asked for a file | A hosted page, published as an HTML artifact, that runs its own queries | <references/hosted-page.md> |
| A coding agent without hosted pages, such as Claude Code, Cursor, or Codex, or an explicit file request | A live local page that the agent fills through the Stripe MCP server | <references/local-dashboard.md> |

### Step 2: Show progress

Do this before reading any file or planning. For a local page, write and open the page in its loading state instead, as **Write and open the page** in <references/local-dashboard.md> describes.

For a hosted page, publish this loading artifact in HTML and CSS only, in about 30 lines. Fill the viewport with the page background `#F4F7FA`, and center one column horizontally and vertically, with its text centered:

- A 32-pixel spinner: a `#D4DEE9` ring with a `#533AFD` top edge, completing a rotation every 1 second.
- “Building dashboard…” in 20-pixel semibold `#1A2C44` type, and “This could take a few minutes.” in 14-pixel `#3C4F69` type below it.
- Three white placeholder cards in a row, 160 by 72 pixels each, with a 1-pixel `#D4DEE9` border and an 8-pixel corner radius, pulsing between full and half opacity.
- No title, header, or other text. Use the system font stack.

### Step 3: Choose the account

Call the account listing tool, `list_available_accounts_or_orgs`. For a local page in a session signed in with an API key, which doesn’t list that tool, call `get_stripe_account_info` for its one account instead, send no `stripe_context` or `livemode`, because the key sets both, and show no mode badge.

Consider only account entries, whose `stripe_context` starts with `acct_`, never organization entries (`org_…`). Use the account the user named, matched by name or ID, otherwise the first account listed, in its mode. If no account is listed, say that the connection needs a Stripe account, not only an organization, and stop.

### Step 4: Read the references

In one command, read <references/dashboard-design.md> for the layout, labels, and states, <references/queries.md> for the time windows, queries, responses, and calculations, and the reference for your output. Don’t search the docs, fetch Stripe pages, or call `describe_capabilities`, `guide`, or `stripe_data_search`: the references are complete.

### Step 5: Build the dashboard and run the queries

Follow **Build the dashboard** in the reference for your output.

### Step 6: Hand over

Follow **Hand over** in the reference for your output.

## Reference files

The `references/*.md` files come with this skill. Reference paths are relative to this skill’s directory, not to the docs.stripe.com root. If you don’t have the skill files locally, append the path to **https://docs.stripe.com/.well-known/skills/stripe-bfcm-dashboard/**. For example, fetch **https://docs.stripe.com/.well-known/skills/stripe-bfcm-dashboard/references/queries.md**.

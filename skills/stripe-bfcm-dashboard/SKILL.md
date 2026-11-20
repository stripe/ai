---
name: stripe-bfcm-dashboard
description: >-
  Builds a Black Friday and Cyber Monday (BFCM) season dashboard of payments,
  customers, and recurring revenue from the connected Stripe MCP account, as a
  hosted dashboard or artifact where the agent's tools support one, otherwise as
  one HTML file. For the 2026 BFCM season only. Use when a merchant asks for a
  BFCM, Black Friday, Cyber Monday, holiday, holiday sales, or peak-season
  dashboard, such as "build me a holiday dashboard" or "build me a Cyber Monday
  dashboard," even without the word BFCM.

---

## Stripe BFCM Dashboard

Build the “Stripe BFCM Dashboard” from a fixed layout and a fixed set of queries. It’s a starting point: the user can follow up to add metrics or change the style. The dashboard shows recurring revenue, growth, and payments for a time window, with an optional comparison, using [Analytics API](https://docs.stripe.com/data/metrics.md) metrics and [Query Runs API](https://docs.stripe.com/data/api/queries.md) SQL through the Stripe MCP server or connector.

The dashboard needs the Stripe MCP server or connector, signed in to the Stripe account it shows, with access to the Analytics API and the Query Runs API. It assumes the connection signed in through Stripe (OAuth), which can list accounts and choose one. A session signed in with an API key is limited to that key’s account and mode, and works only for a dashboard that the agent fills, not one that queries Stripe itself. If the Stripe tools are missing, blocked, or need sign-in, say so in one line with the fix, such as connecting the [Stripe MCP server](https://docs.stripe.com/mcp.md#manual) and signing in, and stop. Don’t produce an empty dashboard.

## Rules

- **Check the Stripe tools, then show the loading page**: Before anything else, confirm that this session lists `stripe_analytics` with the intents `execute_query_run`, `retrieve_query_run`, and `execute_metric`. If you can’t see its intents, look up that one tool’s input schema, never the whole Stripe server, and read only its intent names. If the tool or an intent is missing, tell the user which one, with the fix, and stop without a loading page. Otherwise, choose the account in step 2 with its one Stripe call, and make your next tool call publish or write the loading page from step 3. Don’t read a reference, run tool discovery, or make another Stripe call before it exists, and leave anything else the host asks for before publishing, such as reading its page guide or listing its artifact types, for step 4. The only lookup allowed first is one the publishing call can’t be made without, such as that tool’s input schema. Apart from the Stripe tools check, steps 1 to 3 need nothing but this file.
- **Start building, and don’t prompt the user**: The layout, metrics, queries, and defaults are fixed. Don’t ask which metrics, period, time zone, output, or account to use, or for a key or account ID. Start as soon as the user invokes the skill. The only question is the auto-refresh one in the hand-over. If the user asks something while you build, answer in a few lines and keep building in the same turn.
- **Stripe MCP only, read-only**: Query Stripe only through the Stripe MCP server or connector, never with an API key, the Stripe CLI, or a server you build. Query one account, chosen in step 2, in every request, with no silent switch.
- **Exact numbers**: Use only the queries and response shapes in the references. Preserve integer precision and currency minor units. Never invent values, show unreadable results as values, or substitute other data products.
- **Keep secrets and customer data out of every output**: Never put keys or tokens in chat, browser code, artifacts, or logs, and never export MCP tokens. Query only counts and amounts. Never select, show, store, or log customer names, emails, or other customer fields.
- **One output, no automatic sharing**: Update one stable output. Don’t auto-share it or enable connection sharing. Explain actual host authorization and audience restrictions before the user shares.

## Workflow

### Step 1: Choose the output

Choose from the tools this session already lists, not from the client’s name, and without reading a file. If a listed tool can create a hosted dashboard, page, or artifact, such as a Claude artifact, and update it later, use it, and name the output `stripe-bfcm-dashboard` where the tool takes a name. Prefer a hosted output whose pages can call the Stripe connector, because that dashboard can refresh itself. You check that in step 4, after the loading page. Otherwise, or if the user asked for a file, use one HTML file, `stripe-bfcm-dashboard.html` in the working directory. If that name is taken by a file you didn’t create, pick another name that starts with `stripe-bfcm-dashboard` instead of asking. **Choose the output** in <references/dashboard-output.md> has the rest, which you read in step 4.

### Step 2: Choose the account

Call the account listing tool, `list_available_accounts_or_orgs`. In a session signed in with an API key, which doesn’t list that tool, call `get_stripe_account_info` for its one account instead, send no `stripe_context` or `livemode`, because the key sets both, and show no mode badge.

Consider only account entries, whose `stripe_context` starts with `acct_`, never organization entries (`org_…`). Use the account the user named, matched by name or ID, otherwise the first account listed, in its mode. If no account is listed, say that the connection needs a Stripe account, not only an organization, and stop without a loading page.

### Step 3: Show progress

Do this before reading the references or planning. Publish the loading page with the hosted tool you chose, or write it to the HTML file and open the file in the user’s default browser, such as with `open` on macOS or `xdg-open` on Linux. In the file only, add `<meta http-equiv="refresh" content="3">`, so the open page shows the dashboard when you write it over this one. Writing the file needs no git command: a repository, or an untracked path in one, isn’t a reason to wait. If you can’t open the file, say in one line that you’re building the dashboard and that it could take a few minutes, and continue.

Write the loading page in HTML and CSS only, in about 30 lines. Fill the viewport with the page background `#F4F7FA`, and center one column horizontally and vertically, with its text centered:

- A 32-pixel spinner: a `#D4DEE9` ring with a `#533AFD` top edge, completing a rotation every 1 second.
- “Building dashboard…” in 20-pixel semibold `#1A2C44` type, and “This could take a few minutes.” in 14-pixel `#3C4F69` type below it.
- Three white placeholder cards in a row, 160 by 72 pixels each, with a 1-pixel `#D4DEE9` border and an 8-pixel corner radius, pulsing between full and half opacity.
- No title, header, or other text. Use the system font stack.

### Step 4: Read the references

Read the three references in parallel, each with its own read call, so none is cut off. Read <references/dashboard-design.md> for the layout, labels, and states, <references/queries.md> for the time windows, queries, responses, and calculations, and the rest of <references/dashboard-output.md> for building, refreshing, checking, and handing over the output. The references are complete. This holds even when a Stripe tool’s description says to search first or not to guess metric names. The metric names, request `params`, and SQL in the queries reference are valid as written.

For hosted output, then check whether its pages can call the Stripe connector, as **Page refresh** in the output reference describes.

### Step 5: Build the dashboard and run the queries

Follow **Build the dashboard** in <references/dashboard-output.md>. The dashboard isn’t done until it holds the Stripe results and passes every check in **Check before publishing** there.

### Step 6: Hand over

Follow **Hand over** in <references/dashboard-output.md>. Describe only the location, account, mode, view, and refresh behavior you verified.

## Reference files

The `references/*.md` files come with this skill. Reference paths are relative to this skill’s directory, not to the docs.stripe.com root. If you don’t have the skill files locally, append the path to **https://docs.stripe.com/.well-known/skills/stripe-bfcm-dashboard/**. For example, fetch **https://docs.stripe.com/.well-known/skills/stripe-bfcm-dashboard/references/queries.md**.

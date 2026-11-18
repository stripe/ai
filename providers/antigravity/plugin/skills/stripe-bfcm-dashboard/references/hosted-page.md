# Hosted dashboard requirements

Use this in chat clients that publish pages that can call the Stripe connector, such as Claude on the web and desktop. The page queries Stripe itself through the viewer’s connector.

## Build the dashboard

1. **Full page**: Replace the loading artifact with the full page, with the account you chose written into it: its `stripe_context`, name, and `livemode`. The page opens on the same loading screen as the loading artifact, and shows the dashboard only after every first-load query has succeeded or failed. Always publish an HTML artifact, never paste the page’s HTML into the chat. The page runs the queries itself through the viewer’s Stripe connector, using the connector call in the queries reference (`queries.md`).
2. **Capabilities**: Declare the page’s capabilities. Apart from choosing the account and the check in Hand over, don’t make Stripe calls in the conversation. Don’t use a database, the Claude Data type, or a scheduled task: each one makes the client ask the user for approval and slows the build. Don’t write tests, previews, or checks of the published page.

Build the page to these limits:

- **Every panel**: Every card, chart, and table from the dashboard design, with its title and a loading placeholder.
- **Small script**: Aim for about 400 lines. Use one metric queue, one polling helper, one formatter, and one bar or line chart function. Don’t build an error classifier, a job registry, or series toggles.
- **Self-contained**: Draw charts with inline SVG in the page’s own script. Load no remote scripts, fonts, or images.

## Page behavior

The page does this each time it opens:

1. **Account**: Call `list_available_accounts_or_orgs` only to confirm that the written account is listed, and never pick another. Show it in the header as the dashboard design describes. Start the queries after this call succeeds. The client asks the viewer to allow the Stripe connector on this first call, so a failure usually means the viewer hasn’t answered yet: keep the loading screen, show no message, and retry the call every 3 seconds. Show one message in place of the loading screen only when the call succeeds without the account, or still fails after 2 minutes: “Connect Stripe with access to Acme (acct_…) in Settings > Connectors, then select Try again,” naming the account, and a **Try again** button that starts the account check again.
2. **View**: Compute the time zone and time windows from the queries reference, so the windows stay current.
3. **Queries**: Run the queries from the queries reference in its order, with its pacing, polling, and single retry.
4. **Refresh**: The **Refresh** button reruns the queries, with each waiting chart and table showing its spinner as the dashboard design’s Refreshing state describes. If a query fails, its panels show their old values again with “Couldn’t refresh” and **Retry**, and the header reads “Partially refreshed,” as the dashboard design describes.
5. **Auto-refresh**: After every first-load query has succeeded or failed, refresh every 5 minutes while the page is visible, as **Refresh** does, but without panel spinners, as the dashboard design’s Refreshing state describes. Skip a turn while a refresh or a range change runs. The date range control stays enabled: choosing a range or a comparison during an auto-refresh stops it and discards its results. When a hidden page becomes visible after 5 minutes or more, refresh right away.
6. **Date range**: Enable the date range control from the dashboard design after every first-load query has succeeded or failed. Choosing a range or a comparison clears every result from the previous range, shows each panel’s loading state, and reruns the queries for the chosen range with the custom range rules in the queries reference. A query that fails shows its failed state, never the previous range’s values.

## Hand over

1. **Check**: In the conversation, send one Analytics API `revenue.mrr` metric request for the current window and the chosen account. It shows that the connection works for the account. If the response doesn’t match the `execute_metric` shape in the queries reference, report it as the check’s error. Don’t run the other queries.
2. **Reply**: Never say the dashboard is published or ready, because the page is still loading its data. In a few short lines:
   - First: “Your BFCM dashboard is loading above. The panels fill in as their data arrives.”
   - The view in plain words, such as “It shows the last 7 days plus today so far, Fri, Nov 6 – Fri, Nov 13, with no comparison. Black Friday is Nov 27. From that day on, the page opens on BFCM 2026 compared with BFCM 2025. You can pick another comparison from the date range control.”
   - The account’s name, ID, and mode. If the connection lists other accounts, say how many, and that the user can ask for another one by name. If the check failed, give the error and its fix instead.
   - “Times are in your browser’s time zone. Data runs about 1–3 hours behind, so the numbers aren’t live. The page refreshes every 5 minutes while it’s open, and when you select Refresh.”
   - “Claude may ask you to allow the Stripe connector the first time.”
   - “This page is private to you. Anyone you share it with needs their own Stripe connection with access to this account.”

Don’t share the page automatically. Viewers need their own Stripe connection that includes the account.

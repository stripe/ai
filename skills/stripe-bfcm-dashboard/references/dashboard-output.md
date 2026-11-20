# Dashboard output requirements

Use this reference to choose the dashboard’s output, build it, refresh it, check it, and hand it over. The steps are the same in every agent. You run the queries through the connected Stripe MCP server or connector and write the results into one output: a hosted dashboard or artifact where this session’s tools support one, otherwise one HTML file.

## Choose the output

The skill’s step 1 makes this choice from the listed tools, before the loading page. Check it against these rules now.

1. **Inspect your tools**: Read the tools this session lists, and their schemas, for operations that create, edit, publish, or export a page or file, and for any that let a page refresh its own data. Use tool discovery if the session has it, for page and file tools only. The queries reference covers the Stripe tools, so don’t load their schemas here. If you find a hosted tool only now, and the user didn’t ask for a file, use it, and delete the loading file you wrote. Go by what’s listed, not by the client’s name, because the same client can list different tools in different sessions. Artifacts in Claude, Sites in ChatGPT, and file or artifact tools in Codex are examples, and no client is sure to have them. Never call a tool, operation, or parameter that the session doesn’t list.
2. **Prefer hosted output**: If a listed tool can create a hosted dashboard, page, or artifact, such as a Claude artifact, that holds the complete dashboard, with every panel and its inline script, and can update it later, use it.
3. **Otherwise, write one HTML file**: If no listed tool can do that, the user asked for a file, or creating or updating the hosted output fails, write the dashboard as one self-contained HTML file, `stripe-bfcm-dashboard.html` in the working directory. Export or attach it if a listed tool can. Never overwrite a file you didn’t create: pick another name that starts with `stripe-bfcm-dashboard` instead of asking.

Don’t ask the user to choose an output, and don’t stop because a hosting tool is missing.

## Build the dashboard

The skill’s workflow starts queries before writing any HTML. This section covers the build after queries are running.

1. **Show the loading page (first build only)**: The skill’s step 4 writes the loading page and opens it. Skip this on a refresh — go straight to updating the existing dashboard in place.
2. **Poll and build in memory**: Poll the queries until every one finishes or fails. While polling, build the full dashboard page in memory: the layout, header, all panel containers, the `@stripe/charts` CDN script, and each panel’s data as its query completes. Print a short status in chat every 2 minutes so the user knows the build is alive — “Still waiting on N queries…” or “All queries complete — finalizing.”
3. **Save once**: When every query has finished (or failed), save the complete dashboard to the file or hosted output, overwriting the loading page. One save, at the end, with all the numbers in it. Don’t save intermediate states — there is nothing for the open loading page to pick up until the data is ready. Don’t add `<meta http-equiv="refresh">` to the file. A panel whose query succeeded gets its full spec; a panel whose query failed gets the failed state from the design reference.
4. **Open the finished dashboard**: For HTML files, open the file again (`open` on macOS, `xdg-open` on Linux) so the finished dashboard appears. For hosted output, the update is live. Run every check in Check before publishing. Store the account’s name, ID, mode, view boundaries, time zone, last successful query time, and any failures. Escape stored strings for their HTML context.

Treat the results this way:

- **Some queries failed**: Show the failed state in the affected panels only, as the dashboard design describes, and publish the rest.
- **No data**: Queries that succeed with no rows are results, not failures. Show the dashboard design’s no-data states.
- **Every query failed**: Don’t publish or hand over a dashboard. Replace any loading page with the error and its fix, say the same in the chat, and stop.

Build the page to these limits:

- **Small script**: Aim for about 300 lines. Use `StripeCharts.render` for all charts and KPI tiles — don’t write custom SVG chart functions, formatters, or axis logic. The page script handles data wiring, layout, refresh, and sources only.
- **Self-contained**: Use `@stripe/charts` for all charts and KPI tiles, loaded via npm, CDN, or inline SVG as the design reference’s fallback chain describes. Load no other remote scripts, fonts, or images.
- **No extra storage**: Don’t add a database, a scheduled task, or a second data file. The results live in the page.

## Page behavior

- **Open with results**: The page draws every panel from its embedded results when it opens, and makes no network requests. It computes totals, changes, and averages with the queries reference’s calculations, and shows the stored view’s dates, time zone, and refresh status, never the day or time zone it’s opened in.
- **Agent refresh**: The page can’t query Stripe itself unless the output environment says so, because your Stripe connection belongs to you, not to the browser. Its button reads **Copy refresh request**, copies “Refresh my Stripe BFCM Dashboard” to the clipboard, and reads “Copied. Paste it to your agent” for 4 seconds. If the clipboard isn’t available, it shows that text selected instead. If the viewer has no way to send you that request, leave the button out. The date range shows as text, as the dashboard design describes.
- **Page refresh**: For hosted output, check whether its pages can call the Stripe connector, and how. Read the hosting tool’s description and schema. If the session lists a tool that describes what the host’s pages can do, such as `describe_capabilities` in Claude, call it once, asking about the connector directly and passing the loading page’s ID where the tool takes one. If pages can call the connector, build a page that queries Stripe itself, as the next section describes. Use **Agent refresh** only when they can’t, when the output is a file, or in a session signed in with an API key, which can’t list accounts for the page’s account check.

### Pages that query Stripe themselves

Use the call the environment documents, with the tool and intent names you confirmed, and declare the page’s tools the way it requires. For example, where a Claude artifact offers it, `const mcp = await claude.use("mcp")` (it can be `null`), then `await mcp.callTool("Stripe", tool, input)`. Read `.payload`, which can be an object or JSON text. A failure rejects. The loading page is already published, so declare the same tools on it first, such as `{"mcp": {"servers": [{"server": "Stripe", "tools": ["stripe_analytics", "list_available_accounts_or_orgs"]}]}}`, then publish the dashboard over it. Don’t write this call into a page whose environment doesn’t offer it.

The page adds this behavior, with one metric queue and one polling helper:

1. **Account**: Before its first query, call `list_available_accounts_or_orgs` only to confirm that the written account is listed, and never pick another. The client can ask the viewer to allow the Stripe connector on this first call, so a failure usually means the viewer hasn’t answered yet: keep the embedded results and retry the call every 3 seconds. Show one message only when the call succeeds without the account, or still fails after 2 minutes: “Connect Stripe with access to Acme (acct_…), then select Try again,” naming the account, and a **Try again** button that starts the account check again.
2. **View**: Keep the embedded results under their stored dates and time zone until new results replace them. Before each refresh, compute the time zone and time windows from the queries reference. If their dates or time zone differ from the view on the page, such as on a later day, treat the refresh as a range change, as **Date range** describes.
3. **Refresh**: The **Refresh** button reruns the queries from the queries reference in its order, with its pacing, polling, and single retry. Each waiting chart and table shows its spinner as the dashboard design’s Refreshing state describes. If a query fails, its panels show their old values again with “Couldn’t refresh” and **Retry**, and the header reads “Partially refreshed,” as the dashboard design describes.
4. **Auto-refresh**: Off unless the user asks for it, as Hand over describes. When it’s on, refresh every 5 minutes while the page is visible, as **Refresh** does, but without panel spinners, as the dashboard design’s Refreshing state describes. Skip a turn while a refresh or a range change runs. The date range control stays enabled: choosing a range or a comparison during an auto-refresh stops it and discards its results. When a hidden page becomes visible after 5 minutes or more, refresh right away.
5. **Date range**: Enable the date range control from the dashboard design. Choosing a range or a comparison clears every result from the previous range, shows each panel’s loading state, and reruns the queries for the chosen range with the custom range rules in the queries reference. A query that fails shows its failed state, never the previous range’s values.

## Refresh or change the view

When the user asks, rerun the queries and update the same dashboard, artifact, or file. Never create a second one. If updating a hosted output fails, write the HTML file instead, and say that the earlier link is out of date.

- **Refresh, same view**: Keep each earlier result until its new one succeeds. Mark a query that fails as failed to refresh, so the page keeps its old values with a failure note.
- **Different period or time zone**: Rerun every query for the new view. Never keep a result from the previous view.

Then run the checks in Check before publishing again for the values and controls that changed. An HTML file that’s already open keeps showing its old figures, so after you write the file, open it again so the updated dashboard appears.

## Check before publishing

Check the filled-in dashboard before you publish, export, or hand it over:

- **Numbers**: Use only successful, complete Stripe results and calculations from those results. Never show failed or unreadable results as zeros. Mark retained values as stale after a failed refresh.
- **Account**: Show the selected account’s name and ID, and its verified Stripe mode as the dashboard design describes. Check that every result belongs to that account and mode. Never work out the mode from missing metadata.
- **Refresh mode**: Describe only the refresh behavior the output supports. Reloading saved results doesn’t retrieve new Stripe data. Make the refresh button’s label match its action — “Copy refresh request” if it only copies instructions, omitted if no refresh is supported.
- **Privacy**: Keep credentials, tokens, and customer-identifying data out of the page, embedded data, generated source, files, and URLs.

Don’t launch headless Chrome, Puppeteer, or any browser-based rendering step to verify the dashboard, unless the user asks or requires you to test its frontend changes. Otherwise, the user’s own browser is the only view that matters.

Fix failed checks before publishing. If you can’t verify a check, including the account or mode, explain what’s missing and stop. In a session signed in with an API key, the key sets the mode and no tool reports it: say in the hand-over that the mode is the key’s, without naming one. Apply the same checks to hosted output and HTML files.

## Hand over

Give the dashboard’s location on its own line: the URL or download that the publishing or export operation returned, or the file’s full path after you confirm the file exists. Never write a URL yourself. Then, in a few short lines:

- The view: the date range and dates, such as “Last 7 days plus today so far, Fri, Nov 6 – Fri, Nov 13, 2026.” Only mention a comparison if one is active — don’t say “with no comparison.” Keep it to what the dashboard actually shows.
- The headline payment volume, such as “$1,106.71 from 16 successful payments.” Include the change only if a comparison is active — don’t say “no change figure” or explain why there isn’t one. If the range has no data, say so, with the account’s first or latest activity and an offer to show the range the design reference’s no-data card gives.
- The account’s name, ID, and verified mode. If the connection lists other accounts, say how many, and that the user can ask for another one by name.
- The time zone, the time of the last successful retrieval, and any failed panels.
- How the dashboard refreshes, as built: either “Ask me to refresh it. It doesn’t update on its own,” adding for hosted output that its pages can’t query Stripe in this client, or, for a page that queries Stripe itself, “The page refreshes when you select Refresh,” and that the client may ask the viewer to allow the Stripe connector.
- Who can open it, as the host enforces it. A file isn’t a sharing link. Anyone who can open the dashboard or file can read its saved figures without a Stripe connection. In a page that queries Stripe itself, a viewer needs their own Stripe connection with access to the account only to retrieve new data.

For a page that queries Stripe itself, end with one question: “Do you want the page to refresh every 5 minutes while it’s open?” Don’t wait for the answer before handing over. If the user says yes, turn auto-refresh on in the same page, without rerunning the queries.

For any other dashboard, end with: “Would you like me to refresh the data, or add a comparison to the previous BFCM?” Don’t wait for the answer before handing over.

Don’t share the dashboard automatically.

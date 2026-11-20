# Dashboard output requirements

Use this reference to choose the dashboard’s output, build it, refresh it, check it, and hand it over. The steps are the same in every agent. You run the queries through the connected Stripe MCP server or connector and write the results into one output: a hosted dashboard or artifact where this session’s tools support one, otherwise one HTML file.

## Choose the output

The skill’s step 1 makes this choice from the listed tools, before the loading page. Check it against these rules now.

1. **Inspect your tools**: Read the tools this session lists, and their schemas, for operations that create, edit, publish, or export a page or file, and for any that let a page refresh its own data. Use tool discovery if the session has it, for page and file tools only. The queries reference covers the Stripe tools, so don’t load their schemas here. If you find a hosted tool only now, and the user didn’t ask for a file, use it, and delete the loading file you wrote. Go by what’s listed, not by the client’s name, because the same client can list different tools in different sessions. Artifacts in Claude, Sites in ChatGPT, and file or artifact tools in Codex are examples, and no client is sure to have them. Never call a tool, operation, or parameter that the session doesn’t list.
2. **Prefer hosted output**: If a listed tool can create a hosted dashboard, page, or artifact, such as a Claude artifact, that holds the complete dashboard, with every panel and its inline script, and can update it later, use it.
3. **Otherwise, write one HTML file**: If no listed tool can do that, the user asked for a file, or creating or updating the hosted output fails, write the dashboard as one self-contained HTML file, `stripe-bfcm-dashboard.html` in the working directory. Export or attach it if a listed tool can. Never overwrite a file you didn’t create: pick another name that starts with `stripe-bfcm-dashboard` instead of asking.

Don’t ask the user to choose an output, and don’t stop because a hosting tool is missing.

## Build the dashboard

1. **Run the queries**: For the account you chose, use the time windows from the queries reference (`queries.md`), and run its queries in its order, with its pacing, polling, and single retry.
2. **Write the results in**: Write the page with every card, chart, and table from the dashboard design, and embed the results in it. Store each result under its query `id` from the queries reference, with its status (`ok` or `failed`), its rows with amounts and counts as the strings the query returned, its `refreshed_at`, and its request `params` or SQL. Add the account’s name, ID, and mode, the view boundaries, the time zone, the time the last successful query finished, and whether any query failed. Escape stored strings for their HTML context.
3. **Check it**: Run every check in Check before publishing.
4. **Publish it**: Create the hosted output, or write the file, with the operation you chose. Replace the loading page instead of creating a second output: write the dashboard over the loading file, without its reload tag, so the open page shows it. Never paste the page’s HTML into the chat.

Treat the results this way:

- **Some queries failed**: Show the failed state in the affected panels only, as the dashboard design describes, and publish the rest.
- **No data**: Queries that succeed with no rows are results, not failures. Show the dashboard design’s no-data states.
- **Every query failed**: Don’t publish or hand over a dashboard. Replace any loading page with the error and its fix, say the same in the chat, and stop.

Build the page to these limits:

- **Small script**: Aim for about 400 lines. Use one formatter and one bar or line chart function. Don’t build an error classifier, a job registry, or series toggles.
- **Self-contained**: Draw charts with inline SVG in the page’s own script. Load no remote scripts, fonts, or images.
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

Then run the checks in Check before publishing again for the values and controls that changed. An HTML file that’s already open keeps showing its old figures, so after you write the file, open it again, or tell the user to reload the page if you can’t.

## Check before publishing

Check the filled-in dashboard before you publish, export, or hand it over:

- **Numbers**: Use only successful, complete Stripe results and calculations from those results. Never show failed or unreadable results as zeros. Mark retained values as stale after a failed refresh.
- **Account**: Show the selected account’s name and ID, and its verified Stripe mode as the dashboard design describes. Check that every result belongs to that account and mode. Never work out the mode from missing metadata.
- **Period**: Check that the reporting dates, comparison dates, and time zone match the queries. Don’t keep values from another period.
- **Last refreshed**: Use the last successful retrieval time, not the render or file-write time. When you run the queries, read the clock right after each successful result arrives, and use the latest of those times. A page that queries Stripe itself does the same. Keep source-data freshness separate, and label partial refreshes accurately.
- **Refresh mode**: Describe only the refresh behavior the output supports. Reloading saved results doesn’t retrieve new Stripe data.
- **Privacy**: Keep credentials, tokens, and customer-identifying data out of the page, embedded data, generated source, files, and URLs.
- **Refresh button**: Make its label match its action. Use “Copy refresh request” if it only copies instructions. Omit the button if no refresh action is supported.

Fix failed checks before publishing. If you can’t verify a check, including the account or mode, explain what’s missing and stop. In a session signed in with an API key, the key sets the mode and no tool reports it: say in the hand-over that the mode is the key’s, without naming one. Apply the same checks to hosted output and HTML files.

## Hand over

Give the dashboard’s location on its own line: the URL or download that the publishing or export operation returned, or the file’s full path after you confirm the file exists. Never write a URL yourself. Then, in a few short lines:

- The view in plain words, such as “This shows the last 7 days plus today so far, Fri, Nov 6 – Fri, Nov 13, with no comparison. Black Friday is Nov 27. Ask me to compare it with BFCM 2025.”
- The headline payment volume and its change, from the finished results. If the range has no data, say so, with the account’s first or latest activity and an offer to show the range the design reference’s no-data card gives.
- The account’s name, ID, and verified mode. If the connection lists other accounts, say how many, and that the user can ask for another one by name.
- The time zone, the time of the last successful retrieval, and any failed panels. Say that data runs about 1–3 hours behind, so the numbers aren’t live.
- How the dashboard refreshes, as built: either “Ask me to refresh it. It doesn’t update on its own,” adding for a file that the user reloads the page afterward, and for hosted output that its pages can’t query Stripe in this client, or, for a page that queries Stripe itself, “The page refreshes when you select Refresh,” and that the client may ask the viewer to allow the Stripe connector.
- Who can open it, as the host enforces it. A file isn’t a sharing link. Anyone who can open the dashboard or file can read its saved figures without a Stripe connection. In a page that queries Stripe itself, a viewer needs their own Stripe connection with access to the account only to retrieve new data.

For a page that queries Stripe itself, end with one question: “Do you want the page to refresh every 5 minutes while it’s open?” Don’t wait for the answer before handing over. If the user says yes, turn auto-refresh on in the same page, without rerunning the queries. Don’t ask it for any other dashboard, because it can’t refresh on its own.

Don’t share the dashboard automatically.

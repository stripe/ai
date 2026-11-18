# Live local dashboard requirements

Use this output in coding agents and other clients that can’t host pages, such as Claude Code, Cursor, and Codex, and for an explicit file request. The agent queries Stripe through the connected Stripe MCP server and writes the results into a local page that’s already open, so each panel fills in as its query returns. It needs no API key, no server, and no questions to the user.

## Write and open the page

1. **Write the page**: In a new directory, such as `stripe-dashboard/` in the working directory, write `index.html` with every panel from the dashboard design in its loading state, and `data.js` containing `window.DASHBOARD_DATA = {"done": false, "results": {}};`. Write both files before sending any query. Never overwrite a file you didn’t create: pick another directory name instead of asking.
2. **Open it**: Open `index.html` in the user’s default browser if the environment allows it, such as with `open` on macOS or `xdg-open` on Linux.

## Build the dashboard

Use the time windows from the queries reference (`queries.md`), and run its queries in its order, with its pacing, polling, and single retry. After each query succeeds or fails, rewrite `data.js` with every result so far. Store each result under its query name, with its status (`loading`, `ok`, or `failed`), its rows with amounts and counts as the strings the query returned, its `refreshed_at`, and its request `params` or SQL. Add the account name and mode, view boundaries, and time zone. After the last query, store the time the last successful query finished, and whether any failed, for the header’s refresh status. Set `done` to `true` after the last query.

Escape stored strings for their HTML context.

## Page behavior

- **Reload**: The page reloads `data.js` every 2 seconds by adding a new `<script>` tag whose `src` ends in `?t=<time>`, removing the previous one. It redraws each panel whose result changed. After `done` is `true`, it reloads every 30 seconds while the tab is visible, so a later refresh shows up without reopening the file. It works from `file://` and makes no network requests.
- **Layout and numbers**: Use the dashboard design layout. The page computes totals, changes, and averages with the queries reference’s calculations. Show the refresh status from the stored time, never the time of the last write to `data.js`.
- **Refresh button**: The page can’t query Stripe itself, because the Stripe MCP connection belongs to the agent. **Refresh** copies “Refresh my Stripe BFCM Dashboard” to the clipboard and reads “Copied. Paste it to your agent” for 4 seconds. If the clipboard isn’t available, it shows that text selected instead. While `done` is `false` after the first load, **Refresh** reads “Refreshing…” and is disabled.

## Refresh or change the view

When the user asks, set `done` to `false`, rerun the queries, and rewrite the same `data.js` after each one. The open page updates by itself.

- **Refresh, same view**: Keep each earlier result until its new one succeeds. Mark a query that fails as failed to refresh, so the page keeps its old values with a failure note.
- **Different period or time zone**: First rewrite `data.js` with the new view, an empty `results`, and `done` set to `false`, so every panel shows its loading state. Never keep a result from the previous view.

## Hand over

Give the full path to `index.html` on its own line. Start with the view in plain words, such as “This shows the last 7 days and today, Fri, Nov 6 – Fri, Nov 13. Ask me to compare it with BFCM 2025.” Give the headline payment volume and its change from the finished results, or say that there’s no data for these dates, with the account’s first or latest activity and an offer to show the range the design reference’s no-data card gives, then the account’s name, ID, and mode. If the connection lists other accounts, say how many, and that the user can ask for another one by name. State the time zone and any failed panels. Say that the page updates when the agent refreshes it, not on its own, and that it isn’t a sharing link.

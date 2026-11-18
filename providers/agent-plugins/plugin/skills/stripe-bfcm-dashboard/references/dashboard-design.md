# Dashboard design

Use this reference to lay out the dashboard, write its labels, and show its states, in both the hosted dashboard and the live local dashboard. Keep every panel listed here, and don’t add others.

## Visual style

Match the Stripe Dashboard’s light theme, so the page feels like part of Stripe. Use these values from Stripe’s design system:

| Role | Value |
| --- | --- |
| Page background | `#F4F7FA` |
| Card background | `#FFFFFF`, with a 1-pixel `#D4DEE9` border and an 8-pixel corner radius |
| Gridlines and dividers | `#ECF1F6` |
| Primary text | `#1A2C44` |
| Secondary text | `#3C4F69` |
| Current window, buttons, and links | `#533AFD` |
| Comparison window | `#7D8BA4` |
| Increase | `#217005` |
| Decrease | `#C0123C` |

- **Type**: The system font stack `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Use tabular numerals (`font-variant-numeric: tabular-nums`) for every value, a large semibold size for headline values, and secondary text for context. Use sentence case for every heading, label, and table row, and never uppercase text or `text-transform: uppercase`.
- **Color use**: Use the current and comparison colors consistently in every panel. Always pair an increase or decrease with an arrow or sign, so a change doesn’t rely on color alone.
- **Quiet panels**: No gradients, shadows heavier than a hairline, or decorative images. Don’t load fonts or images from other hosts.

Show only the text, labels, and controls this reference names. Don’t add hints, captions, footnotes, or helper text.

Lay the page out as a grid, at most about 1,200 pixels wide and centered, with the header across the full width. In each section, put the cards in one row with `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`, so they share the width evenly at equal heights, then the charts and tables two to a row, side by side, with a last odd panel taking half the row. Below about 700 pixels, stack charts and tables in one column. Charts resize with their container. Size every panel to its content: no fixed or minimum heights, so no panel has empty space below its content. Panels in a row share the height of the tallest one.

Order the sections from the top:

1. Header.
2. **Recurring revenue**: the MRR chart beside the MRR growth chart, then the MRR movements table beside the ARR chart.
3. **Growth**: new customers, successful payments, Checkout Sessions, and checkout conversion cards.
4. **Payments**: the payment volume and average order value charts, then the country table.

## Header

The header orients the viewer before any number. “Stripe BFCM Dashboard” is its only heading. Lay it out in three left-aligned rows:

1. **Title row**: The title “Stripe BFCM Dashboard.” **Show sources** and **Refresh** on the right.
2. **Account row**, in secondary text: the account.
3. **Date row**: the date range control, then the refresh status in secondary text.

Style **Show sources**, **Refresh**, and the date range pills alike: 32 pixels high, a 1-pixel `#D4DEE9` border, a 6-pixel corner radius, a white background, and 14-pixel type.

Keep the header to these items:

- The title “Stripe BFCM Dashboard.”
- The Stripe account’s name and ID, with a “Sandbox” badge when `livemode` is false. Show no mode badge in live mode, because “Live” reads as real-time data.
- **Show sources**, described in Sources, and a **Refresh** button that queries Stripe again, or in the local dashboard, hands the refresh to the agent. While any refresh runs, manual or automatic, it reads “Refreshing…” with a 14-pixel spinner before the text, in `#533AFD` text on a `#F5F3FF` background with a `#533AFD` border, and is disabled, so during a refresh from **Refresh** it’s clear why the date range pills are disabled too. There’s no account picker: the dashboard shows only the connected account.
- In the hosted dashboard, the date range control: two filter pills, each with a muted label, its value in primary text, and a small ▾, such as **Date range · Last 7 days** and **Compare · None**. A pill opens a popover with the presets or comparison options from the queries reference (`queries.md`), by name only. **Custom** shows two date inputs inside the popover and no other text: limit their range with the inputs’ `min` and `max`, not a hint. Its pill then reads “Nov 6 – Nov 12.” Position the popover over the page, 4 pixels below its pill, as a white card with a hairline border and an 8-pixel corner radius, so the layout never moves. Choosing an option applies it and closes the popover; for **Custom**, after both dates form a valid range. Choosing the option that’s already applied only closes the popover, and **Custom** opens with the current dates filled in. Make every control a `type="button"` with no `<form>`, so no click or **Enter** reloads the page. **Escape** or a click outside closes it. Keep both pills disabled until every first-load query has succeeded or failed, and while a refresh from **Refresh** runs: a disabled pill opens nothing. Auto-refresh leaves them enabled. Keep each popover hidden until its pill opens it, so no empty popover shows. In the local dashboard, show the pills’ values as text instead.
- The refresh status, from successful queries, never the time the page was drawn. After every query of a load or refresh has succeeded, “Last refreshed: Nov 13, 2026, 9:41 AM PST,” the time the last of them succeeded, with the selected time zone’s abbreviation. If any failed, “Partially refreshed: Nov 13, 2026, 9:41 AM PST · 2 panels failed,” so a partial load never reads as complete. Before the first load finishes, show nothing. Source-data freshness and errors stay in the sources.
- If you dropped the comparison for lack of data, “No data for BFCM 2025 on this account” after the refresh status, naming that comparison.

## Panels

Panels have no buttons or links, except **Retry** on a failed panel and the copy icon in the sources. Each card shows its title and its value in large type, plus its change when there’s a comparison, and nothing else: no dates, definitions, or notes on why a value is missing. Put that context in the sources. Show a genuine zero as zero and a missing value as a dash. In the bottom-right corner of each chart and table, show how long ago its data was updated, from its current-window result’s `refreshed_at`, in 12-pixel secondary text, as the Stripe Dashboard does: “Updated just now,” “Updated 1 minute ago,” “Updated 3 hours ago,” or “Updated 2 days ago.” Work it out when the panel is drawn, and update it every minute. Every value comes from the calculations in the queries reference (`queries.md`).

- **Comparisons**: Name the comparison in every change, legend, and tooltip, such as “↑ 12% per day vs. BFCM 2025 ($4,210)” or “BFCM 2025,” never “before” or “previous.” Without a comparison, leave out changes, comparison values, and comparison lines and bars. Include the year in every date outside the current year.
- **ARR chart**: Titled “ARR,” drawn like the MRR chart, with no comparison line or change.
- **MRR growth chart**: Titled “MRR growth,” with the net MRR change as its headline, signed, such as “+$1,234.00,” and the comparison’s net change, such as “vs. BFCM 2025 (+$980.00).” Grouped bars of each day’s net MRR change for both windows, by day of the window, with negative days below a zero line and exact signed amounts and both actual dates in the tooltip. Use bars, because each day is a change, not a level.
- **MRR chart**: Titled “MRR,” with its headline value and change. Lines for both windows, aligned by day of the window, with exact formatted amounts and dates in the tooltip. Use lines, not bars, because each point is a value on that day, not a flow. Don’t start the y-axis at zero if that flattens the change.
- **MRR movements**: A table of the six movement categories, then the net movement.
- **New customers, Successful payments, and Checkout Sessions**: Each card shows its count in large type, the change with an arrow, and the comparison count.
- **Checkout conversion**: The rate as a percentage, its change, and the comparison rate.
- **Average order value chart**: Titled “Average order value,” with its headline value, the change, and the comparison value, or a dash when there’s none. Lines for both windows by day of the window, with a gap on a day with no value.
- **Payment volume chart**: Titled “Payment volume,” with its headline value, the change, and the comparison value. Grouped bars by day of the window for windows of 14 days or fewer, lines for longer windows, with exact formatted amounts and both actual dates in the tooltip. Show a missing day as a gap, not a zero.
- **Payment volume by country**: Rows for each named country with a proportional bar, the current amount, and the comparison amount with its change. Show a dash where the comparison has no row, and show a null or empty country as “No country value.” Show this table only for windows of 31 days or fewer.

## States

| State | What to show |
| --- | --- |
| Loading | On the hosted page’s first load, the loading screen until every query has succeeded or failed. After that, and in the local page, a small spinner in each card, chart, and table that’s waiting. Draw no axes, zeros, or empty charts until its result arrives. |
| No data | Always show the cards, with their zeros or dashes. A chart or table with no rows in the current window shows the empty state in place of its chart or rows, never a flat line or empty axes: centered, a 44-pixel `#F4F7FA` circle holding a 20-pixel bar-chart icon in `#3C4F69`, then “No data yet” and “Data will appear when activity is recorded.” on two lines in 14-pixel `#3C4F69` type. Never hide a panel whose query is pending or failed. |
| No data for the range | See below. |
| Refreshing | During a refresh from **Refresh**, each chart and table that’s waiting shows the small loading spinner in place of its content until its new result arrives, at its current size so the layout doesn’t move. Cards keep their prior values. During auto-refresh, every panel keeps its prior values until new results arrive, with no spinners or placeholders. |
| Failed | “Couldn’t load this panel.” with a **Retry** button, in the affected panels only. |

### No data for the range

When every current-window query has succeeded with no rows or only zero values, and there are no movements, the range has no data, often because the account is new. Don’t draw zero panels, which read as a flat result. Keep the header, so the date pills still work, and replace the three sections with one card, about 240 pixels high, with the empty state’s circle and icon above centered text. Its title is **No data for this time range**, followed by “Acme (acct_…, Sandbox) has no payments, customers, or subscriptions from Fri, Nov 6 – Fri, Nov 13, 2026.” Then one line from First activity, from the queries reference:

- **No activity yet**: “This account has no payments, customers, or subscriptions yet. The dashboard fills in as they arrive.” In a sandbox, add “Create test payments to try it.”
- **First activity after the range**: “This account’s first activity is on Mon, Sep 14, 2026.” Add a **Show since Sep 14** button that sets a custom range from that day through today. If that is longer than 92 days, the range is the first 92 days from that day instead, and the button reads **Show Sep 14 – Dec 14**.
- **Latest activity before the range**: “This account’s latest activity is on Thu, Oct 2, 2026.” Add a **Show Sep 3 – Oct 2** button for the 30 days ending that day.
- **Otherwise, or if First activity fails**: “Try a longer range from **Date range**.”

The local page shows the same card without buttons, and the hand-over offers the range instead.

## Sources

**Show sources** switches every card, chart, and table to its source together, and reads **Hide sources** while it’s on. Each panel keeps its size and its title, shown once at the top, and shows the source below the title in place of the rest of its content, scrolling inside the panel if it’s longer, so the layout never moves.

A source lists only the requests that produced the panel’s value, each in its own block:

- **A direct value**, such as Payment volume or MRR, shows the one request that produced it. A SQL query covers both windows in one request. Don’t list the account lookup, MRR or other metadata, a request that wasn’t sent, or a second fetch of the same data. Panels that share a result show the same request.
- **A derived value or a comparison** lists each request behind it, such as the current and comparison MRR growth requests for the MRR growth chart, and no others.
- **A failed attempt** appears as an error detail under its request, such as “Attempt 1 failed: rate limited. Retried,” not as another source. A failed panel shows its failed request with the error.

Each block shows:

- No heading, label, or note that repeats the panel’s title or names its metric, because the title already does. Only a comparison request’s block starts with a heading, “Comparison.” Never label a request with a letter or number.
- The endpoint that ran: `POST /v2/data/analytics/metric_query` for metrics, or `POST /v2/data/query_runs` for query runs.
- What it sent, in a monospace block: the metric request’s `params` as JSON, or the query run’s SQL. In the block’s top-right corner, show a 16-pixel clipboard icon button, labeled “Copy” for screen readers and in its tooltip, that copies the block’s exact text and shows a check mark for 2 seconds. Show it only while sources are on. If the clipboard isn’t available, select the block’s text instead, so the user can copy it.
- Whether the request is stale or failed. Don’t repeat when the data was last updated: charts and tables show it on the panel.
- Notes that explain the value, which panels leave out: what it counts, such as “Succeeded payments, as requested. Not net or recognized revenue,” for payment volume, “Checkout and Elements payments only” for average order value, “Latest daily value, not a sum” for MRR and ARR, “Sessions whose payment page loaded, Checkout and Elements only” for Checkout Sessions, and why a value is a dash, such as “No comparison for these dates.”

Don’t show API keys, OAuth tokens, response IDs, raw rows, or customer data.

## Charts

Draw charts with inline SVG and load no remote scripts. Keep charts simple: bars or lines, axes, a legend, and a tooltip. Don’t add series toggles, zooming, or sorting. Match the Stripe Dashboard’s charts:

- **Panel**: The title in 14-pixel primary text, the headline value in large semibold type under it, then the chart, about 180 pixels high, then the last-updated line.
- **Y-axis**: On the right, with 3 to 5 labels at round values and a light gridline at each, in 12-pixel secondary text. Use compact amounts, such as “$2K,” “−$10K,” and “$1.10M,” with as many decimals as it takes for every label to differ. Start flows, such as payment volume, at zero, and include zero when a series goes negative.
- **X-axis**: A hairline baseline with 3 or 4 evenly spaced date labels, such as “Nov 1,” “Nov 8,” and “Nov 15,” including the first day.
- **Marks**: Lines are 2 pixels wide, with no point markers, and bars have 2-pixel rounded tops. A tooltip on hover shows the exact amount and date.

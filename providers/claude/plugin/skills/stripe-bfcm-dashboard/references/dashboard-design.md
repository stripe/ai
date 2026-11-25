# Dashboard design

Layout, labels, and states for every output. Keep every panel listed here; this is the complete set.

## Page style

Page background is white `#FFFFFF`. Cards are white with a 1-pixel `var(--sc-color-divider, #D4DEE9)` border and 8-pixel radius — they separate visually because the border is visible on white.

Use `--sc-*` tokens from `@stripe/charts` for non-chart elements so everything shares one theme:

```css
body { background: #FFFFFF; color: var(--sc-color-text-primary, #1A2C44); }
.card { background: var(--sc-color-surface, #FFFFFF); border: 1px solid var(--sc-color-divider, #D4DEE9); border-radius: 8px; }
.secondary { color: var(--sc-color-text-secondary, #3C4F69); }
.increase { color: var(--sc-color-good, #217005); }
.decrease { color: var(--sc-color-bad, #C0123C); }
.accent { color: #533AFD; }
```

`#533AFD` is for buttons, links, and country bars — not chart series. The copy icon uses secondary text color. Use sentence case everywhere.

## Layout

A grid, at most ~1,200 pixels wide and centered. KPI tiles four to a row with `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`. Charts and tables two to a row; a last odd panel takes half the row. Below ~700 pixels, stack in one column. KPI tile cards should be compact — constrain their height so the sparkline stays small (about 120–140px total card height). Use `align-items: stretch` on the KPI grid row so every tile in a row matches the tallest one, including an empty tile with no sparkline, within that height cap.

Section order:

1. Header.
2. **Recurring revenue**: MRR chart beside MRR growth chart, then MRR movements table beside ARR chart.
3. **Growth**: new customers, successful payments, Checkout Sessions, and checkout conversion tiles.
4. **Payments**: payment volume and average order value charts, then the country table.

## Header

Three left-aligned rows:

1. **Title**: “Stripe BFCM Dashboard.” **Show sources** and **Refresh** on the right.
2. **Account**: name and ID in secondary text, with a “Sandbox” badge when `livemode` is false. Style the badge amber: border `#E8C48A`, background `#FFF6E5`, text `#8A5A00`. Show no badge in live mode.
3. **Date row**: date range control on the left, then refresh status right-aligned in secondary text. Don’t show the timezone (e.g. “America/Los_Angeles”) in the header — it’s used internally for queries but not displayed.

Style buttons and date pills alike: 32px high, 1-pixel `var(--sc-color-divider)` border, 6-pixel radius, white background, 14-pixel type.

- **Refresh** (dashboard that queries Stripe itself): reruns queries. While running, reads “Refreshing…” with a spinner, `#533AFD` text on `#F5F3FF` background, disabled. In any other dashboard, use the copy-refresh button from the output reference, or none.
- **Date range** (dashboard that queries Stripe itself): two pills — **Date range · Last 7 days** and **Compare · None** — each opens a popover with presets from the queries reference. **Custom** shows two date inputs. Disabled until first load completes and during manual refresh. In a file dashboard, show one static pill with the range label and dates (e.g. **Last 7 days · Nov 13 – Nov 19**) — styled the same but not clickable, no popover, no Compare pill.
- **Refresh status**: Show just the time when the refresh happened today — “Last refreshed: 9:41 AM PST”. Include the date only when it was a different day — “Last refreshed: Nov 13, 9:41 AM PST”. “Partially refreshed: 9:41 AM PST · 2 panels failed” if any failed. Nothing before first load.
- If comparison was dropped for lack of data: “No data for BFCM 2025 on this account.”

## Panels

When `@stripe/charts` is available (npm or CDN), every chart and KPI tile is rendered by `StripeCharts.render`. When using inline SVG as the last resort, follow the inline SVG specs in Charts below instead. The page card is the frame — one card container per panel. Strip the library’s own card styling so there’s no double border:

```css
.card .sc-root, .card .sc-root.sc-tile {
  border: none; padding: 0; background: none; border-radius: 0; box-shadow: none;
}
```

Let stripe-charts render the title — pass `title` in the spec. To keep the title visible in sources view, add a hidden heading in the card container (e.g. `<h3 class="panel-title" style="display:none">…</h3>`) that sources mode shows when it swaps content. Below the chart `<div>`, add an “Updated X ago” line in 12-pixel secondary text, from the result’s `refreshed_at`, updated every minute. In chart and table cards, pin that line to the bottom of the card (`display: flex; flex-direction: column` on the card, `margin-top: auto` on the line), so it lines up across a row. Leave the line out of an empty panel. Hide this line in sources view — only show it in chart view.

Panel data rules:

- **Comparisons**: Name the comparison everywhere — “↑ 12% per day vs. BFCM 2025 ($4,210)”, never “before” or “previous.” Without a comparison, omit changes and comparison series.
- **MRR, ARR**: Latest daily value, not a sum. ARR has no comparison.
- **MRR growth**: Net MRR change as headline — prepend “+” for positive values in the headline text (e.g. “+$1,234.00”); negative values already show “−”. Grouped bars of daily net change. Negative days go below zero.
- **MRR movements**: A table (not a chart) of six categories — New, Expansion, Contraction, Churn, Reactivation, FX adjustment — then net movement. Current window only, no comparison.
- **New customers, Successful payments, Checkout Sessions**: Count tiles (`chart.type: 'kpi'`). Use `basis: 'total'`.
- **Checkout conversion**: `sessions_succeeded / sessions_loaded` as a percentage. Use `basis: 'custom'`.
- **Payment volume**: Bars for ≤14 days, lines for longer. A day with no rows is zero, not a gap.
- **Average order value**: Line chart. Plot every day in the window. A day with no payments is `y: null` (gap in the line). Headline is window amount / window count with `basis: 'custom'`.
- **Payment volume by country**: A table (not a chart) — top 10 countries by current amount, with proportional bars in accent `#533AFD`, current and comparison amounts. Only for windows ≤31 days.

## States

| State | What to use |
| --- | --- |
| Loading | stripe-charts: `{loading: true}` shows a skeleton. Update with `handle.update(fullSpec)` when data arrives. |
| Empty | As **Empty panels** below describes: stripe-charts’ empty state for charts, custom HTML for KPI tiles and tables. |
| Refreshing (manual) | stripe-charts: `handle.update({...spec, loading: true})` for charts and tables. KPI tiles: keep prior spec. |
| Refreshing (auto) | Keep prior spec in all panels — no loading states. |
| Failed | Custom HTML (stripe-charts has no error state): hide the chart `<div>`, show “Couldn’t load this panel.” with a **Retry** button in the card container. On retry success, hide the error, show the chart `<div>`, and call `handle.update(fullSpec)`. |

### Empty panels

A panel is empty only when it has no value to show, such as a rate or average with a zero denominator. A count or amount of zero is a value: show 0, not the empty state.

- **Charts**: stripe-charts’ own empty state: one series with empty data, `series: [{label: '…', data: []}]`, and `emptyMessage: 'No data yet'`. Add nothing to it.
- **Tables**: keep the title and show “No data yet” in secondary text.
- **KPI tiles**: stripe-charts ignores `emptyMessage` on KPI tiles, so render the title with `StripeCharts.render`, `chart.type: 'kpi'`, and `series: [{label: '…', data: []}]`, then add below it a muted em dash (`—`) where the value goes, in 28-pixel semibold secondary text, and one line saying why the tile is empty, in 14-pixel primary text. Don’t repeat the window’s dates: the header already shows them. Checkout conversion’s reason is “No checkout sessions.”

A panel pulses only while its query is still pending. After its result arrives (success or failure), the pulse stops. After all queries are done, no panel should pulse.

### No data for the range

When every current-window query succeeds with no rows or only zeros: keep the header, replace all sections with one centered card (~240px high):

**No data for this time range** — “Acme (acct_…, Sandbox) has no payments, customers, or subscriptions from Fri, Nov 6 – Fri, Nov 13, 2026.”

Then one line based on First activity query:

- **No activity yet**: “This account has no payments, customers, or subscriptions yet.” In sandbox, add “Create test payments to try it.”
- **First activity after range**: “First activity is on Mon, Sep 14, 2026.” Add **Show since Sep 14** button (capped at 92 days).
- **Latest activity before range**: “Latest activity is on Thu, Oct 2, 2026.” Add **Show Sep 3 – Oct 2** button (30 days ending that day).
- **Otherwise**: “Try a longer range from **Date range**.”

A dashboard that can’t query Stripe shows this card without buttons.

## Sources

**Show sources** toggles every panel to show its source in place of its content. In sources mode, hide the chart `<div>` and show the hidden `.panel-title` heading so the title stays visible. Each panel keeps its size.

Each source block shows:

1. **One-sentence description** of what the metric measures, in secondary text above the code area:

| Panel | Description |
| --- | --- |
| Payment volume | Succeeded payment intent volume, or attributed line-item volume for product or price queries. |
| Average order value | Average succeeded payment amount, or average line-item amount for product or price queries. |
| New customers | Count of customers created, by day. |
| Successful payments | Count of succeeded PaymentIntents, by day. |
| Checkout Sessions | Checkout sessions whose payment page was initialized, and those that completed successfully. |
| Payment volume by country | Succeeded payment intent volume grouped by country. |
| MRR | Monthly recurring revenue from active and past-due subscriptions. |
| ARR | Annual recurring revenue from active and past-due subscriptions. |
| MRR growth | Net change in MRR over time. |
| MRR movements | Net change in MRR over time, broken down by change type. |
| Checkout conversion | Succeeded session count divided by initiated session count for each aggregate bucket, in basis points. |

1. **The request** — the endpoint (`POST /v2/data/analytics/metric_query` or `POST /v2/data/query_runs`) and the params or SQL. Pretty-print JSON params (indented, one key per line) and format SQL with line breaks and indentation for readability. Show the code area with a gray background and rounded corners. In the top-right corner of the code area, a 16-pixel clipboard icon inside a 32-pixel button (no text label). When selected, copy the code text, swap the icon to a check mark, and show “Copied” for 4 seconds, then restore. If the clipboard isn’t available, select the text instead.

2. **Status** — whether stale or failed, if applicable.

Don’t show API keys, tokens, response IDs, raw rows, or customer data.

## Charts

Use `@stripe/charts` for every chart and KPI tile. Try loading in this order:

### 1. npm (preferred, when available)

If the output is a project with a package manager:

```bash
npm install @stripe/charts
```

```js
import {render} from '@stripe/charts';
render(el, spec);
```

If install fails (package not yet published), fall through to CDN.

### 2. CDN (default for HTML files and artifacts)

```html
<div id="sc-fallback" style="display:none;text-align:center;padding:40px;color:#3C4F69">
  Charts couldn't load — check your connection and reload the page.
</div>
<script src="https://cdn.jsdelivr.net/gh/stripe/charts@0.0.1-preview.1/dist/stripe-charts.min.js"
  onerror="document.getElementById('sc-fallback').style.display='block'"></script>
```

Works in browsers (local HTML), Claude artifacts, ChatGPT Sites, and Cursor. May not work in sandboxed environments (Codex containers) or offline.

### 3. Inline SVG (last resort)

Use when the environment blocks both npm and CDN. Build charts with one reusable `drawChart(el, spec)` function using inline SVG:

- **Line charts**: 2px stroke, no point markers. First palette color for primary, `#95A4BA` dashed for comparison.
- **Bar charts**: Grouped side by side, 2px rounded tops.
- **KPI tiles**: Title in 14px, value in 28px semibold, change with arrow below.
- **Y-axis**: Right side, 3–5 labels, compact format (“$2K”), light gridlines.
- **X-axis**: Hairline baseline, 3–4 date labels.
- **Tooltip**: On hover, show exact value and date.
- **Empty / loading**: Center “No data yet” text, or the **Empty panels** KPI layout for tiles / pulse animation on placeholder.

Note limitations (no sparklines, no incomplete-day markers, no accessibility) in the hand-over.

### stripe-charts API and series colors

`StripeCharts.render(element, spec)` returns a handle with `update(spec)` and `destroy()`.

**Do not set `color` on any series.** Let the library assign its palette. With one primary series per chart, every chart gets purple `#9966FF`. The full palette in order: purple `#9966FF`, blue `#0055BC`, cyan `#00A1C2`, orange `#ED6804`, magenta `#B3063D`, dark green `#1C5A0D`, pink `#FA4A67`, brown `#922700`, green `#3DA00B`. Comparison series are gray `#95A4BA`.

### Examples

**Payment volume** — currency bar chart with comparison:

```js
StripeCharts.render(el, {
  version: 1,
  title: 'Payment volume',
  format: {style: 'currency', currency: 'usd', unit: 'minor'},
  kpi: {value: 984200, basis: 'total', comparisonValue: 870100},
  chart: {
    type: 'bar', stacking: 'grouped',
    axes: {y: {notation: 'compact'}},
    incomplete: {from: '2026-11-13', message: 'Partial day'},
  },
  series: [
    {label: 'BFCM 2026', data: [{x: '2026-11-27', y: 312000}, ...]},
    {label: 'BFCM 2025', comparison: true, data: [{x: '2025-11-28', y: 290100}, ...]},
  ],
});
```

**MRR** — line chart, headline is latest value:

```js
StripeCharts.render(el, {
  version: 1,
  title: 'MRR',
  format: {style: 'currency', currency: 'usd', unit: 'minor'},
  kpi: {value: 1250000, basis: 'latest', comparisonValue: 1180000},
  chart: {type: 'line', axes: {y: {notation: 'compact'}}},
  series: [
    {label: 'Current', data: [...]},
    {label: 'BFCM 2025', comparison: true, data: [...]},
  ],
});
```

**KPI tile** — count with sparkline:

```js
StripeCharts.render(el, {
  version: 1,
  title: 'New customers',
  format: {style: 'number', maximumFractionDigits: 0},
  kpi: {value: 847, basis: 'total', comparisonValue: 612},
  chart: {type: 'kpi'},
  series: [{label: 'New customers', data: [{x: '2026-11-06', y: 120}, ...]}],
});
```

**Average order value** — line chart, null gaps for days with no payments:

```js
StripeCharts.render(el, {
  version: 1,
  title: 'Average order value',
  format: {style: 'currency', currency: 'usd', unit: 'minor'},
  kpi: {value: 4500, basis: 'custom'},
  chart: {type: 'line', axes: {y: {notation: 'compact'}}},
  series: [{label: 'AOV', data: [{x: '2026-11-12', y: 4500}, {x: '2026-11-13', y: null}, ...]}],
});
```

**Loading → populated**:

```js
const handle = StripeCharts.render(el, {version: 1, title: 'Payment volume', loading: true});
handle.update({version: 1, title: 'Payment volume', format: {...}, series: [...]});
```

### Panel-to-chart mapping

| Panel | `chart.type` | `format.style` | `kpi.basis` |
| --- | --- | --- | --- |
| Payment volume | `bar` (≤14d) or `line` | `currency` | `total` |
| MRR | `line` | `currency` | `latest` |
| ARR | `line` | `currency` | `latest` |
| MRR growth | `bar` grouped | `currency` | `total` |
| Average order value | `line` | `currency` | `custom` |
| New customers | `kpi` | `number` | `total` |
| Successful payments | `kpi` | `number` | `total` |
| Checkout Sessions | `kpi` | `number` | `total` |
| Checkout conversion | `kpi` | `percent`, `unit: 'ratio'` | `custom` |

Comparison series use `comparison: true` and align by position (index), not date. When the window includes today, set `chart.incomplete.from` to today’s date. All Stripe amounts are minor units — always set `unit: 'minor'`. Use `stacking: 'grouped'` only on bar charts — omit it when the chart type is `line`.

# Queries and calculations

Use this reference for every number on the dashboard. The general rules come first: the queries at a glance, their placeholders, time windows, how to run and read the queries, and the calculations. Then the queries follow in the order the dashboard runs them, each with its SQL or request. Use these queries and response shapes exactly, instead of designing new ones.

## Overview

The dashboard runs these queries, in this order.

| Query | Type | Windows |
| --- | --- | --- |
| New customers | SQL | Both, in one request |
| Successful payments | SQL | Both, in one request |
| Checkout Sessions | SQL | Both, in one request |
| Payment volume | SQL | Both, in one request |
| Average order value | SQL | Both, in one request |
| Payment volume by country | SQL | Both, in one request. Skipped for windows longer than 31 days |
| MRR | Metric | Current |
| ARR | Metric | Current. It has no comparison |
| MRR comparison | Metric | Comparison. Skipped with no comparison |
| MRR growth | Metric | Current |
| MRR growth comparison | Metric | Comparison. Skipped with no comparison |
| First activity | SQL | Neither. Runs only when the range has no data |

## Placeholders

Every query uses these placeholders. CUR is the current window and CMP is the comparison window. SQL takes UTC instants as `YYYY-MM-DD HH:MM:SS`, and metric requests take them as `YYYY-MM-DDTHH:MM:SSZ`.

| Placeholder | Value | Example |
| --- | --- | --- |
| `{CUR_START}` | The current window’s start | `2026-11-06 08:00:00` |
| `{CUR_END}` | The current window’s exclusive SQL end: now, or the next local midnight | `2026-11-14 00:27:04` |
| `{CUR_END_INCL}` | The current window’s inclusive metric end: now, or 1 second before the next local midnight | `2026-11-14T00:27:04Z` |
| `{CMP_START}` | The comparison window’s start | `2025-11-28 08:00:00` |
| `{CMP_END}` | The comparison window’s exclusive SQL end | `2025-12-02 08:00:00` |
| `{CMP_END_INCL}` | The comparison window’s inclusive metric end | `2025-12-02T07:59:59Z` |
| `{TZ}` | The IANA time zone | `America/Los_Angeles` |

The comparison must come before the current window, so the SQL’s `CASE` split works. With no comparison, set `{CMP_START}` and `{CMP_END}` to `{CUR_START}`, an empty range, so the SQL keeps one shape, and send no comparison metric request.

## Time windows

Both outputs show the same view, unless the user asks for another period.

- **Time zone**: The IANA zone the user named, otherwise the viewer’s own zone: the browser’s `Intl.DateTimeFormat().resolvedOptions().timeZone` in a hosted page, or the system zone in a coding agent. Use Pacific time (`America/Los_Angeles`) only if neither is available. Every result is in this local time zone.
- **BFCM**: The 4 days from Black Friday, the day after US Thanksgiving (the fourth Thursday in November), through Cyber Monday.
- **Default view**: Before this year’s Black Friday, the last 7 complete local days plus today so far, with no comparison. From Black Friday on, this year’s BFCM through today, compared with the previous BFCM, day for day.
- **Comparison**: One of **None**, **Previous BFCM** (the most recent BFCM that ended before the current window starts), or **Same dates last year**. Choosing another range keeps the chosen comparison. If every comparison query has succeeded, every comparison SQL query has no rows, its Payment volume and MRR are zero on every day, and MRR growth comparison has no movements, the account has no data then: drop the comparison and say so, rather than showing zeros.
- **Presets**: **Last 7 days**, **Last 14 days**, and **Month to date** end with today so far, like the default view. **Month to date** starts at local midnight on the first of the current month in the selected time zone. **BFCM 2025** covers those 4 days, and **BFCM 2026** appears from Black Friday on and runs through today. **Custom** follows the custom range rules.
- **Custom range**: From **Custom** or the user’s request, the chosen local start and end dates, inclusive. End no later than today, and keep the range to at most 92 days. The comparison follows the boundary rules.
- **Boundaries**: Windows start and end at local midnights, each converted to UTC on its own date, so the windows follow daylight saving time. Every Analytics API request for a window that includes today ends at now, the time of the request, so it returns the latest data. A window that ended earlier, such as a comparison or a past custom range, ends 1 second before the next local midnight: metric ends are inclusive. SQL ends are exclusive: now, or the next local midnight.
- **Comparison boundaries**: **Same dates last year** covers the current window’s dates 1 year earlier. **Previous BFCM** covers that BFCM’s 4 full days, except while this year’s BFCM is in progress: when the current window starts on this year’s Black Friday and ends today, on or before Cyber Monday, the comparison covers the same number of days from the previous Black Friday, day for day. When the current window includes today, a comparison that matches it day for day ends at the same local time on its matching day, so both windows cover the same hours. A full 4-day **Previous BFCM** ends 1 second before the local midnight after Cyber Monday.

For example, on Nov 13, 2026 in Pacific time, the current window is Fri, Nov 6 – Fri, Nov 13, from `2026-11-06T08:00:00Z` up to now, and no comparison. **Month to date** starts Sun, Nov 1, at `2026-11-01T07:00:00Z`, because daylight saving time ends only later that day, and its requests end at now. If the user picks **Previous BFCM**, the comparison is BFCM 2025, Fri, Nov 28 – Mon, Dec 1, 2025, from `2025-11-28T08:00:00Z` to `2025-12-02T07:59:59Z`, and its changes compare per day, because the windows have 8 and 4 days.

## Running the queries

- **Order**: On first load and on refresh, start the queries in the order they’re listed under Queries. Create the query runs back to back, without waiting for one to finish before the next. In a sandbox (`livemode` false), which allows 1 query run creation per second, send each creation at least 1 second after the previous one. Send the Analytics API metric calls one at a time, each at least 1 second after the previous metric response. Query runs and metric calls don’t wait for each other, and each panel fills as soon as its result arrives.
- **Skips**: With no comparison, skip every comparison metric query, and give the SQL an empty comparison window. Skip Payment volume by country for windows longer than 31 days.
- **One fetch**: Share each result across all panels that need it, and never fetch the same data twice. Each query’s name is its ID in the page’s code.
- **Limits**: Keep each daily metric window to at most 92 days, and use at most one `group_by` dimension.
- **Polling**: Poll a pending query run after 2 seconds, then 4, then every 5 seconds, for up to 5 minutes.
- **Failures**: Treat a call with no response after 60 seconds as a network error, so no query stays pending. Retry a rate limit, network, or server error once after about 2 seconds, holding new calls during a rate-limit wait. Never retry other errors unchanged. Show failures only in the affected panels.
- **Freshness**: Data isn’t real-time. Query-run tables can lag about 3 hours, and recurring metrics about 1 hour. Show each query’s `refreshed_at` as the design reference describes, and never promise live numbers.
- **More metrics**: Start with only the queries here. If the user asks for more charts, use the [supported metrics](https://docs.stripe.com/data/metrics/supported-metrics.md).

### Requests

Every `stripe_analytics` call takes `stripe_context` and `livemode` from the account, an `intent`, and `params`. In a session signed in with an API key, leave out `stripe_context` and `livemode`.

Before writing any call, check the Stripe tools your session lists and the `stripe_analytics` input schema. This skill expects `stripe_analytics`, with the intents `execute_query_run`, `retrieve_query_run`, and `execute_metric`, and `list_available_accounts_or_orgs`. If the session lists a different tool or intent for the same job, use the listed name everywhere, including the hosted page’s tool declaration, and mention it in the hand-over. If no listed tool runs a metric or a query run, say so and stop, as for missing Stripe tools.

- **Query Runs API SQL**: `"intent": "execute_query_run"` with `"params": {"sql": "…"}`. Poll with `"intent": "retrieve_query_run"` and `"params": {"query_run_id": "qryrun_…"}`, adding `page` and `limit` for later pages. Fill in the placeholders as the Placeholders section describes.
- **Analytics API metric**: `"intent": "execute_metric"` with the query’s `params`, such as `{"stripe_context": "acct_…", "livemode": true, "intent": "execute_metric", "params": {"name": "revenue.mrr", "starts_at": "2025-11-28T08:00:00Z", "ends_at": "2025-12-02T07:59:59Z", "granularity": "day", "timezone": "America/Los_Angeles"}}`. Fill in the placeholders as the Placeholders section describes. `{TZ}` makes the API bucket each day in local time.
- **From a hosted page**: Write the tool and intent names you confirmed into one constant at the top of the script, and use only that constant in calls. `const mcp = await claude.use("mcp")` (it can be `null`), then `await mcp.callTool("Stripe", tool, input)`. Read `.payload`, which can be an object or JSON text. A failure rejects. Publish the page first, then declare the same tools, such as `{"mcp": {"servers": [{"server": "Stripe", "tools": ["stripe_analytics", "list_available_accounts_or_orgs"]}]}}`.

### Responses

These are the shapes the tools return as of this skill. Parse responses with these shapes. Anything else is unreadable: show the failed state with **Retry**, never guessed values.

- **Wrapper**: Every `stripe_analytics` response arrives as `{"tooltip": "…", "result": {…}}`. Unwrap `result`, and ignore `tooltip`.
- **`list_available_accounts_or_orgs`**: `{"accounts": [{"stripe_context": "acct_…", "livemode": true, "name": "…"}]}`.
- **`get_stripe_account_info`**: `{"account_id": "acct_…", "display_name": "…", "dashboard_api_keys_link": "…"}`, with no mode. Use `account_id` and `display_name`.
- **`execute_metric`**: `result.data[]` holds one row per bucket: `{"timestamp": "2026-10-01T07:00:00.000Z", "dimensions": {}, "results": [{"name": "revenue.mrr", "value": "1250000", "currency": "usd"}]}`. The value and currency are in `results[]`, matched by `name`, not on the row itself. `value` is an integer, sent as a string or a number. `timestamp` is the bucket’s start in UTC: convert it to the local day. A grouped row puts its group in `dimensions`, such as `{"change_type": "MRR_CHURN"}`. `result.refreshed_at` and `result.created` are top-level. Empty buckets come back as rows with zero values, except that a grouped query with no groups returns an empty `data`, which means no movements. The API doesn’t paginate: `next_page_url` is always `null`, and one response holds the whole series. If a non-empty result’s rows don’t reach the window’s last day, treat it as incomplete.
- **`execute_query_run` and `retrieve_query_run`**: `result.status` is `running`, `succeeded`, `failed`, or `canceled`. Rows are in `result.result.inline.rows[].data`, as objects keyed by column whose values are strings. Treat a cell shaped `{"string_value": "…"}` as its string. Follow `result.result.inline.next_page_url` by passing it as `params.page`, with the same `query_run_id` and `limit`. `result.result.row_count` is the total across all pages, not the size of one page. An identical cached run can come back from create as `succeeded` with only `result.result.file`. When that happens, call `retrieve_query_run` with `include: ["result.inline"]`. `result.refreshed_at` is the data watermark.
- **SQL values**: Every SQL value except `created` is cast to `varchar`, so 64-bit integers arrive as strings. Amounts are whole numbers of the default currency’s minor units, rounded once in the SQL. Payment volume and Average order value’s `created` is a timestamp of the local date at midnight, labeled UTC, such as `2026-11-06T00:00:00.000Z` for Nov 6: read its first 10 characters as the date, without converting it. The other daily queries return the local date as `day`.
- **Completeness**: Follow every inline result page before computing anything. A missing or incomplete result is a failure, never an empty success. After a complete SQL result, a day with no rows means zero.

## Calculations

Apply these rules in the page’s code, never by estimating in prose:

- **Precision**: Parse amounts and counts from strings without rounding through floating point. Format money using [Stripe minor units](https://docs.stripe.com/currencies.md#minor-units), including zero- and three-decimal currencies. Round only for display.
- **Currency**: The payments queries convert each payment to the account’s default currency at its UTC day’s average exchange rate, as the `payments.*` Analytics API metrics do, and return that currency in `currency`. Format their amounts with it, and never convert them again. Rows that report different currencies are unreadable. A payment with no exchange rate for its day adds nothing to the volume but still counts in the average’s denominator. Never group or filter payments by product or price: that changes the quantity to attributed pre-discount line-item amounts. Payment volume isn’t net revenue, recognized revenue, or profit.
- **Today**: Every total, change, average, rate, chart, table, and card includes today up to now. MRR and ARR use the latest daily bucket, which is today’s when the window includes today.
- **Changes**: Compare window totals. When the windows have different numbers of days, compare each additive total, such as a count, payment volume, or MRR movements, divided by its window’s days, and label the change “per day.” MRR and ARR are levels, not totals: compare their latest daily values directly, never per day. Averages and rates also compare directly, and checkout conversion’s change is in percentage points. Show a dash for the percentage change when the comparison is missing or zero. Never leave out a failed query to produce a total.
- **Averages and rates**: Never average daily averages. A zero denominator means no value, not zero.
- **Countries**: Rank the current window’s named countries by `succeeded_amount_in_merchant_default_currency`, and show the top 10, each with its comparison row from the same result. Show a null or empty country as one row, after them. Don’t build an overall total by adding country rows.

## Queries

Run these in this order. Each one covers both windows unless it says otherwise.

The Payment volume, Average order value, and Payment volume by country queries share three parts:

- **Window split**: The `CASE` labels each row `comparison` or `current`, so the comparison must end before the current window starts.
- **Local day**: In Payment volume and Average order value, the nested `DATE_TRUNC` and `DATE_ADD` shift each `created` by the `{TZ}` offset, then cut it to the day.
- **Currency conversion**: The `exchange_rate_daily_averages` join converts each payment at its UTC day’s average rate, and `ROUND(COALESCE(SUM(…), 0))` returns whole minor units.

### New customers

The count of customers created by day. The New customers card shows its total.

```sql
-- Daily new customers per window
SELECT CASE WHEN created < TIMESTAMP '{CMP_END}' THEN 'comparison' ELSE 'current' END AS win,
  date_format(from_unixtime(to_unixtime(created), '{TZ}'), '%Y-%m-%d') AS day,
  CAST(COUNT(*) AS varchar) AS customers
FROM customers
WHERE (created >= TIMESTAMP '{CMP_START}' AND created < TIMESTAMP '{CMP_END}') OR (created >= TIMESTAMP '{CUR_START}' AND created < TIMESTAMP '{CUR_END}')
GROUP BY 1, 2
ORDER BY 1, 2
```

### Successful payments

The count of succeeded PaymentIntents by day. The Successful payments card shows its total.

```sql
-- Daily succeeded PaymentIntent count per window
SELECT CASE WHEN created < TIMESTAMP '{CMP_END}' THEN 'comparison' ELSE 'current' END AS win,
  date_format(from_unixtime(to_unixtime(created), '{TZ}'), '%Y-%m-%d') AS day,
  CAST(COUNT(*) AS varchar) AS payments
FROM payment_intents
WHERE status = 'succeeded'
  AND ((created >= TIMESTAMP '{CMP_START}' AND created < TIMESTAMP '{CMP_END}') OR (created >= TIMESTAMP '{CUR_START}' AND created < TIMESTAMP '{CUR_END}'))
GROUP BY 1, 2
ORDER BY 1, 2
```

### Checkout Sessions

Checkout Sessions whose payment page loaded, as `sessions_loaded`, and those of them that succeeded, as `sessions_succeeded`, by the session’s creation day, for Checkout and Elements only. The Checkout Sessions card shows the total of `sessions_loaded`. The checkout conversion card shows the total of `sessions_succeeded` divided by the total of `sessions_loaded`.

```sql
-- Daily Checkout Sessions loaded and succeeded per window, for Checkout and Elements
SELECT CASE WHEN created_at < TIMESTAMP '{CMP_END}' THEN 'comparison' ELSE 'current' END AS win,
  date_format(from_unixtime(to_unixtime(created_at), '{TZ}'), '%Y-%m-%d') AS day,
  CAST(COUNT(checkout_session_id) AS varchar) AS sessions_loaded,
  CAST(COUNT(CASE WHEN succeeded_at IS NOT NULL THEN checkout_session_id END) AS varchar) AS sessions_succeeded
FROM checkout_session_interactions
WHERE first_initialized_at IS NOT NULL
  AND payment_surface IN ('hosted_checkout', 'embedded_checkout', 'elements', 'custom_checkout', 'payment_form_checkout')
  AND ((created_at >= TIMESTAMP '{CMP_START}' AND created_at < TIMESTAMP '{CMP_END}') OR (created_at >= TIMESTAMP '{CUR_START}' AND created_at < TIMESTAMP '{CUR_END}'))
GROUP BY 1, 2
ORDER BY 1, 2
```

### Payment volume

Succeeded payment volume in the default currency by local day. The Payment volume chart plots each day, and its headline is the window’s total.

```sql
-- Daily succeeded payment volume in merchant default currency per window
SELECT CASE WHEN "payment_intents".created < TIMESTAMP '{CMP_END}' THEN 'comparison' ELSE 'current' END AS win, COALESCE("accounts".default_currency, 'usd') AS currency, CAST(DATE_TRUNC('DAY', CAST(DATE_ADD('MINUTE', CAST(TIMEZONE_MINUTE(AT_TIMEZONE(COALESCE("payment_intents".created, CAST(NULL AS TIMESTAMP)), '{TZ}')) AS BIGINT), DATE_ADD('HOUR', CAST(TIMEZONE_HOUR(AT_TIMEZONE(COALESCE("payment_intents".created, CAST(NULL AS TIMESTAMP)), '{TZ}')) AS BIGINT), COALESCE("payment_intents".created, CAST(NULL AS TIMESTAMP)))) AS TIMESTAMP)) AS TIMESTAMP) AS "created", CAST(CAST(ROUND(COALESCE(SUM( "payment_intents".amount * "exchange_rate_daily_averages".exchange_rate ), 0)) AS BIGINT) AS VARCHAR) AS "succeeded_amount_in_merchant_default_currency" FROM payment_intents AS "payment_intents" LEFT JOIN accounts AS "accounts" ON TRUE LEFT JOIN exchange_rate_daily_averages AS "exchange_rate_daily_averages" ON "exchange_rate_daily_averages".buy_currency = COALESCE("accounts".default_currency, 'usd') AND "exchange_rate_daily_averages".sell_currency = "payment_intents".currency AND CAST(DATE_TRUNC('DAY', "exchange_rate_daily_averages".date) AS TIMESTAMP) = CAST(DATE_TRUNC('DAY', "payment_intents".created) AS TIMESTAMP) WHERE (("payment_intents".created >= TIMESTAMP '{CMP_START}' AND "payment_intents".created < TIMESTAMP '{CMP_END}') OR ("payment_intents".created >= TIMESTAMP '{CUR_START}' AND "payment_intents".created < TIMESTAMP '{CUR_END}')) AND "payment_intents".status = 'succeeded' GROUP BY 1, 2, 3 ORDER BY 1, 3
```

### Average order value

Succeeded volume and count by local day, for Checkout and Elements payments only. The chart plots each day’s `succeeded_amount_in_merchant_default_currency` divided by that day’s `succeeded_payment_count`. Its headline is the window’s total amount divided by its total count.

```sql
-- Daily succeeded average order value in merchant default currency per window, for Checkout and Elements payments
SELECT CASE WHEN "payment_intents".created < TIMESTAMP '{CMP_END}' THEN 'comparison' ELSE 'current' END AS win, COALESCE("accounts".default_currency, 'usd') AS currency, CAST(DATE_TRUNC('DAY', CAST(DATE_ADD('MINUTE', CAST(TIMEZONE_MINUTE(AT_TIMEZONE(COALESCE("payment_intents".created, CAST(NULL AS TIMESTAMP)), '{TZ}')) AS BIGINT), DATE_ADD('HOUR', CAST(TIMEZONE_HOUR(AT_TIMEZONE(COALESCE("payment_intents".created, CAST(NULL AS TIMESTAMP)), '{TZ}')) AS BIGINT), COALESCE("payment_intents".created, CAST(NULL AS TIMESTAMP)))) AS TIMESTAMP)) AS TIMESTAMP) AS "created", CAST(CAST(ROUND(COALESCE(SUM( "payment_intents".amount * "exchange_rate_daily_averages".exchange_rate ), 0)) AS BIGINT) AS VARCHAR) AS "succeeded_amount_in_merchant_default_currency", CAST(COUNT("payment_intents".id) AS VARCHAR) AS "succeeded_payment_count" FROM payment_intents AS "payment_intents" LEFT JOIN payment_intents_with_attributed_sessions AS "payment_intents_with_attributed_sessions" ON "payment_intents".id = "payment_intents_with_attributed_sessions".payment_intent_id LEFT JOIN accounts AS "accounts" ON TRUE LEFT JOIN exchange_rate_daily_averages AS "exchange_rate_daily_averages" ON "exchange_rate_daily_averages".buy_currency = COALESCE("accounts".default_currency, 'usd') AND "exchange_rate_daily_averages".sell_currency = "payment_intents".currency AND CAST(DATE_TRUNC('DAY', "exchange_rate_daily_averages".date) AS TIMESTAMP) = CAST(DATE_TRUNC('DAY', "payment_intents".created) AS TIMESTAMP) WHERE (("payment_intents".created >= TIMESTAMP '{CMP_START}' AND "payment_intents".created < TIMESTAMP '{CMP_END}') OR ("payment_intents".created >= TIMESTAMP '{CUR_START}' AND "payment_intents".created < TIMESTAMP '{CUR_END}')) AND "payment_intents".status = 'succeeded' AND "payment_intents_with_attributed_sessions".payment_surface IN ('hosted_checkout', 'embedded_checkout', 'elements', 'custom_checkout', 'payment_form_checkout') GROUP BY 1, 2, 3 ORDER BY 1, 3
```

### Payment volume by country

Succeeded payment volume by the IP-geocoded country of the payer’s session, for each whole window, for the country table.

```sql
-- Succeeded payment volume in merchant default currency per window and geocoded country
SELECT CASE WHEN "payment_intents".created < TIMESTAMP '{CMP_END}' THEN 'comparison' ELSE 'current' END AS win, COALESCE("accounts".default_currency, 'usd') AS currency, "payment_intents_with_attributed_sessions".geocoded_country AS "geocoded_country", CAST(CAST(ROUND(COALESCE(SUM( "payment_intents".amount * "exchange_rate_daily_averages".exchange_rate ), 0)) AS BIGINT) AS VARCHAR) AS "succeeded_amount_in_merchant_default_currency" FROM payment_intents AS "payment_intents" LEFT JOIN payment_intents_with_attributed_sessions AS "payment_intents_with_attributed_sessions" ON "payment_intents".id = "payment_intents_with_attributed_sessions".payment_intent_id LEFT JOIN accounts AS "accounts" ON TRUE LEFT JOIN exchange_rate_daily_averages AS "exchange_rate_daily_averages" ON "exchange_rate_daily_averages".buy_currency = COALESCE("accounts".default_currency, 'usd') AND "exchange_rate_daily_averages".sell_currency = "payment_intents".currency AND CAST(DATE_TRUNC('DAY', "exchange_rate_daily_averages".date) AS TIMESTAMP) = CAST(DATE_TRUNC('DAY', "payment_intents".created) AS TIMESTAMP) WHERE (("payment_intents".created >= TIMESTAMP '{CMP_START}' AND "payment_intents".created < TIMESTAMP '{CMP_END}') OR ("payment_intents".created >= TIMESTAMP '{CUR_START}' AND "payment_intents".created < TIMESTAMP '{CUR_END}')) AND "payment_intents".status = 'succeeded' GROUP BY 1, 2, 3 ORDER BY 1, 4 DESC
```

### MRR

Monthly recurring revenue for the current window, by day. The MRR chart plots each day, and its headline is the latest daily bucket, never a sum.

`{"name": "revenue.mrr", "starts_at": "{CUR_START}", "ends_at": "{CUR_END_INCL}", "granularity": "day", "timezone": "{TZ}"}`

### ARR

Annual recurring revenue for the current window, by day. The ARR chart plots each day, and its headline is the latest daily bucket. It has no comparison.

`{"name": "revenue.arr", "starts_at": "{CUR_START}", "ends_at": "{CUR_END_INCL}", "granularity": "day", "timezone": "{TZ}"}`

### MRR comparison

MRR for the comparison window. Its latest daily bucket is the MRR headline’s comparison, and its days are the chart’s comparison line.

`{"name": "revenue.mrr", "starts_at": "{CMP_START}", "ends_at": "{CMP_END_INCL}", "granularity": "day", "timezone": "{TZ}"}`

### MRR growth

MRR movements for the current window, by day and `change_type`. The MRR growth chart plots each day’s net change, the sum of that day’s rows, and its headline is the sum of every row. The MRR movements table maps each row’s `dimensions.change_type` to its category before summing: `MRR_NEW` to “New,” `MRR_EXPANSION` to “Expansion,” `MRR_CONTRACTION` to “Contraction,” `MRR_CHURN` to “Churn,” `MRR_REACTIVATION` to “Reactivation,” and `MRR_FX_ADJUSTMENT` to “FX adjustment.” Render exactly those six rows, in that order, with zero for a category that has no rows, then net movement: the six category totals added once each. Any other `change_type` value makes the result unreadable.

`{"name": "revenue_growth.mrr", "starts_at": "{CUR_START}", "ends_at": "{CUR_END_INCL}", "granularity": "day", "timezone": "{TZ}", "group_by": ["change_type"]}`

### MRR growth comparison

MRR movements for the comparison window. The MRR growth chart plots each day’s sum as the comparison’s bars. The sum of every row is its comparison value, shown without a percentage change, because either can be negative or zero.

`{"name": "revenue_growth.mrr", "starts_at": "{CMP_START}", "ends_at": "{CMP_END_INCL}", "granularity": "day", "timezone": "{TZ}"}`

### First activity

The account’s first and latest succeeded payment, customer, or subscription. Run it only when the range has no data, as the design reference (`dashboard-design.md`) defines it, and once per account. A null or missing `first_day` means the account has no activity yet.

```sql
-- First and latest succeeded PaymentIntent, customer, or subscription
WITH events AS (
  SELECT created AS at FROM payment_intents WHERE status = 'succeeded'
  UNION ALL SELECT created FROM customers
  UNION ALL SELECT created FROM subscriptions
)
SELECT date_format(from_unixtime(to_unixtime(MIN(at)), '{TZ}'), '%Y-%m-%d') AS first_day,
  date_format(from_unixtime(to_unixtime(MAX(at)), '{TZ}'), '%Y-%m-%d') AS last_day
FROM events
```

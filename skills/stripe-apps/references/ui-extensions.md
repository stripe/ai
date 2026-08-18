# UI extensions — layout and craft

## UI extensions

UI extensions render custom UI inside the Stripe Dashboard, in a sandboxed iframe. This skill is the **opinionated layout-and-craft layer**: how to compose a full-page or drawer app so it feels native — placement, composition order, spacing, density, states, typography. It does **not** restate component APIs; those live on each component’s doc page, and they’re the source of truth.

### How to use this skill (read first)

- **Component API → fetch the component’s doc BEFORE you import it (required).** SDK components are split across **three import subpaths** — `@stripe/ui-extension-sdk/ui`, `/ui/next`, and `/ui/experimental` — and importing from the wrong one yields an `undefined` component and a **hard crash** (`Element type is invalid`). You can’t tell a component’s subpath from its name — for example `DataTable` and `DetailPage` are under `/ui/experimental` and the charts under `/ui/next`, not the `/ui` you’d expect. So for **every** component you use: (1) **fetch its doc** — `https://docs.stripe.com/stripe-apps/components/<name>.md` (append `?app-sdk-version=9Next` for `Tabs`, `LineChart`, `BarChart`; discover components from the [index](https://docs.stripe.com/stripe-apps/components.md)); (2) **copy the exact import line and required props / data shape** char-for-char; (3) **re-check every import against the doc before you finish.** Don’t infer an API from the component name — a wrong import path, prop, or data shape is a hard runtime error and the #1 reason these apps don’t render.
- **Layout, styles, composition, and states → follow the codified rules here (§2–§3).** These are Stripe’s craft defaults; no single component doc covers them. This is what the skill adds on top of the docs.

### Constraints — the sandbox (these cause silent failures or crashes)

UI extensions run in a **sandboxed iframe on React 17.0.2**. Only SDK components render. Don’t reach for these:

| Blocked | Use instead |
| --- | --- |
| Any HTML tag (`<div>`, `<span>`, `<button>`, `<input>`, `<form>`, `<h1>`…) | SDK components only (`Box`, `Button`, `TextField`, …) |
| CSS / Tailwind / MUI / styled-components / any stylesheet | the `css` prop with design tokens (§3) |
| React 18+ APIs — `useId`, `useTransition`, `useDeferredValue`, concurrent features | React 17 hooks only (Stripe Apps run **React 17.0.2**) |
| `window`, `document`, `localStorage`, `sessionStorage` | not available in the iframe |
| `react-hook-form` / any ref-based form library | uncontrolled inputs — `defaultValue` + `onChange` (see Forms, §3) |
| arbitrary `fetch()` to external URLs | `fetchStripeSignature` for your backend; the SDK client for Stripe APIs |

**Data access (for apps that read Stripe data — the examples here use mock data).** Initialize the client with `createHttpClient` from `@stripe/ui-extension-sdk/http_client` plus the `STRIPE_API_KEY` constant (a **sentinel, not a real key** — it uses the app’s granted permissions), then call standard SDK methods. **Every resource you call must be declared as a permission** (`stripe apps grant permission …`) or the request fails with an invalid-request error. The current object is `environment.objectContext` (for example, `.id` = `"cus_…"`); the signed-in user is **`userContext`, a top-level prop — *not* nested under `environment`**. Full rules: [how UI extensions work](https://docs.stripe.com/stripe-apps/how-ui-extensions-work.md) · [Extensions SDK API reference](https://docs.stripe.com/stripe-apps/reference/extensions-sdk-api.md).

## 1. Placement — pick your viewport

Decide *where in the Dashboard* the app lives; that determines the viewport and the root component. Full viewport list: [viewports reference](https://docs.stripe.com/stripe-apps/reference/viewports.md).

| Your goal | Surface | Viewport | Root component |
| --- | --- | --- | --- |
| A dedicated workspace: tabs, lists, dashboards, multi-step workflows | **Full-page** | [`stripe.dashboard.fullpage`](https://docs.stripe.com/stripe-apps/reference/viewports.md) | [`FullPageView`](https://docs.stripe.com/stripe-apps/components/fullpageview.md) |
| Contextual info/actions tied to a specific object (a customer, a payment) | **Page-specific** | [`stripe.dashboard.customer.detail`, `.payment.detail`, `.list`, `.overview`, …](https://docs.stripe.com/stripe-apps/reference/viewports.md) | [`ContextView`](https://docs.stripe.com/stripe-apps/components/contextview.md) |
| Available on every Dashboard page | **Dashboard-wide drawer** | [`stripe.dashboard.drawer.default`](https://docs.stripe.com/stripe-apps/reference/viewports.md) | [`ContextView`](https://docs.stripe.com/stripe-apps/components/contextview.md) |
| App configuration | **Settings** | [`settings`](https://docs.stripe.com/stripe-apps/reference/viewports.md) | [`SettingsView`](https://docs.stripe.com/stripe-apps/components/settingsview.md) |
| First-run setup after install | **Onboarding** | [`onboarding`](https://docs.stripe.com/stripe-apps/reference/viewports.md) | [`OnboardingView`](https://docs.stripe.com/stripe-apps/components/onboardingview.md) |

Rules of thumb: lead with **full-page** when the app is a destination with more than one section; use a **page-specific** drawer when the value is glanceable context on an existing object; only use `drawer.default` when the app truly applies everywhere. A full-page app can also register drawer/page-specific views — link between them.

## 2. Composition — the build order

The order and *which component does which job* (the API of each is in its linked doc).

**Full-page app** (walkthrough: [full-page apps pattern](https://docs.stripe.com/stripe-apps/patterns/full-page-apps.md)):

1. **Manifest** — register the `stripe.dashboard.fullpage` [viewport](https://docs.stripe.com/stripe-apps/reference/viewports.md) → your view. *(The CLI’s `add view` adds a full-page view to an existing app; the full-page view needs `@stripe/ui-extension-sdk` ≥ 9.2.)*
2. **Shell** — [`FullPageView`](https://docs.stripe.com/stripe-apps/components/fullpageview.md); the header (app name + icon) comes from `stripe-app.json`. Add one `pageAction` only if there’s a single clear top-level action.
3. **Routing** — `createRoutes` + `AppRouter`; read the route with `useAppRoute`, navigate with `useNavigation`. Use a `/:tabId?` pattern so tabs are bookmarkable ([routing](https://docs.stripe.com/stripe-apps/routing.md)).
4. **Tabs** — [`Tabs`/`Tab`](https://docs.stripe.com/stripe-apps/components/tabs.md) for top-level sections. Distinct areas only; don’t nest tabs.
5. **Overview** — [`OverviewPage`](https://docs.stripe.com/stripe-apps/components/overviewpage.md) with a `primaryColumn` (main content, charts) and a `secondaryColumn` (supporting modules). Group content into `PageModule`s with titles; lead with a summary. *(See the [OverviewPage doc](https://docs.stripe.com/stripe-apps/components/overviewpage.md) for the exact column/`PageModule` parent-child contract.)*
6. **List** — [`DataTable`](https://docs.stripe.com/stripe-apps/components/datatable.md): sortable columns, status cells, row → detail route, pagination, and an empty state.
7. **Detail** — [`DetailPage`](https://docs.stripe.com/stripe-apps/components/detailpage.md) with `breadcrumbs` back to the list and two columns. The tab bar isn’t visible here; the breadcrumb is the way back.
8. **Create / edit** — [`FocusView`](https://docs.stripe.com/stripe-apps/components/focusview.md) drawer over the current view.

**Drawer / page-specific app:** root is [`ContextView`](https://docs.stripe.com/stripe-apps/components/contextview.md); keep it **single-column and dense** (a drawer is narrow — don’t force multi-column). Use `environment.objectContext` for the current object. If you also have a full-page experience, link out to it rather than cramming a workflow into the drawer.

## 3. Layout and style rules (the codified craft)

These are the defaults that make an app feel native — they are *not* in any single component doc, so follow them here. Each is tagged **[Required]** (breaks/looks wrong otherwise), **[Recommended]** (Stripe’s craft default), or **[Optional]** (a style choice). Full styling reference: [style your app](https://docs.stripe.com/stripe-apps/style.md).

**[Required] `css` values are tokens, not web CSS.** The `css` prop is not CSS. Every value is a design token or fraction, never a raw unit:

- **Spacing** (`padding`, `margin`, `gap`) → tokens only (`xxsmall`…`xxlarge`). Never `"24px"`, `"1rem"`, `%`.
- **Layout** → `stack: "x" | "y"` with `gap`. There is no `display: "flex"`/`"grid"`.
- **Width** → a fraction (`"1/2"`, `"1/3"`, …) or `"fill"`. **Height** → a bare number for pixels (for example, `height: 180`).
- **Color/background** → semantic tokens (`backgroundColor: "surface" | "container"`, `color: "secondary"`), not hex.

Passing a raw CSS value (px, `flex`, hex) is a hard runtime error — the #1 way a naive build crashes. ([style reference](https://docs.stripe.com/stripe-apps/style.md))

**[Recommended] Spacing — Stripe’s token scale, tighter = more related.** Spacing (`padding`/`margin`/`gap`) uses Stripe’s fixed token scale — match these defaults, never raw px. Use the *smallest* gap that still separates things:

| Token (value) | Default use |
| --- | --- |
| `xxsmall` (2px) | label → its value; tightest intra-element spacing |
| `xsmall` (4px) | icon → adjacent text; spacing inside a chip/badge |
| `small` (8px) | between sibling cards/tiles in a row |
| `medium` (16px) | padding inside a card/module; between fields in a column |
| `large` (24px) | between distinct sections of a page |
| `xlarge` (32px) | between the two major columns of a layout |
| `xxlarge` (48px) | rarely — a major page break |

**[Recommended] Content aligns to the tab’s left edge — no wrapper padding.** The `Tabs` bar and `FullPageView` already set the page’s content edge. Don’t wrap a tab’s panel content in a `Box` with `padding` (or `paddingX`/`paddingLeft`) — that inset pushes content off the tab’s left edge and breaks alignment with the tab labels above it. Use `stack: "y"` + `gap` for vertical rhythm between modules instead; content stays flush to the same left edge as the first tab.

```tsx
// Incorrect — inset; content no longer aligns to the tabs
<Box css={{ stack: "y", gap: "large", padding: "large" }}>…</Box>
// Correct — flush to the tab's left edge
<Box css={{ stack: "y", gap: "large" }}>…</Box>
```

**[Recommended] Page structure — one consistent column layout, `OverviewPage` rendered directly.** Render `OverviewPage` **directly as the tab’s content** — not wrapped in a `Box`, and never with a full-width band stacked above it. `OverviewPage` *is* the layout; pick its shape by whether you pass `secondaryColumn`:

- **One column** → `primaryColumn` only (renders full-width).
- **Two column** → `primaryColumn` + `secondaryColumn`. **Never mix the two** — no full-width KPI row or band above a two-column split. The KPI stat row is the **first `PageModule` of `primaryColumn`** (full-width in one-column mode, primary-column width in two-column mode), *not* a separate row above the component. Group every module into the columns; don’t build a manual column layout.

**[Required] `DetailPage` is its own root route — never inside `FullPageView`.** A detail is a separate route you navigate to (for example, `route("/members/:memberId", …)`) that renders `DetailPage` at the root. `DetailPage` owns its page shell; nesting it in `FullPageView` double-stacks the header. The breadcrumb — not the tab bar — is the way back.

**[Recommended] Overview composition & density — fill the page.** An overview must read as a *dense, width-filling dashboard*, not a short column of big cards. This is the #1 thing that makes an overview look un-native, so compose it deliberately:

1. **Top: a horizontal KPI stat row** — 3–5 equal tiles side by side (see Stat tiles). **Never stack KPI cards vertically full-width** (one metric per row) — a column of oversized single-metric cards wastes the page and reads as un-native.
2. **Below: use both columns.** With `OverviewPage`, put the primary module (a trend `LineChart`, or the main list/table) in `primaryColumn` and supporting modules in `secondaryColumn`; otherwise split with `stack: "x", gap: "xlarge"` into a wider left (`width: "2/3"`) and a narrower right (`width: "1/3"`). Don’t leave half the width empty.
3. **Derive enough views to fill it.** If the data is only a few metrics, add the breakdowns, trends, top-N lists, and recent-activity the data implies (for example, points-over-time trend, members-by-tier breakdown, top members, recent redemptions) rather than leaving whitespace. Aim for **3+ modules** that fill the viewport.

Avoid: a single column of oversized full-width cards; a large empty right side or lower page; one metric per row. Match the density of a native Dashboard overview.

**[Recommended] List pages — the table is the hero.** A dedicated list/directory page (for example, a Members tab) is **the table itself**, full-width, as the primary content. The only things around it: **search / filters** (and segment tabs) *above* the table, **pagination** below, and an **empty state**. **Do not put KPI stat tiles, charts, or dashboard modules on a list page** — those belong on the overview. A native list page is dense with *rows*, not decorated with summary cards on top. Keep it: controls → full-width table (many rows) → pagination. (Overviews are multi-module and dense; list pages are single-purpose and focused — don’t blur the two.)

**[Recommended] Stat tiles — a row of top-line KPI cards.** A **single row of equal `surface` cards** (not a 2×2 grid), each a muted `caption` label above a large `semibold` value — use the card treatment from Cards & trays. Lay them out as a horizontal row with equal widths:

```tsx
// row wrapper: <Box css={{ stack: "x", gap: "medium" }}> … one card per KPI …
<Box css={{ width: "fill", stack: "y", gap: "xxsmall", padding: "medium", borderRadius: "medium", backgroundColor: "surface" }}>
  <Inline css={{ font: "caption", color: "secondary" }}>{label}</Inline>
  <Inline css={{ font: "subtitle", fontWeight: "semibold" }}>{value}</Inline>
</Box>
```

Aim for ~3–5 cards in one row (for example, Total spend · MRR · Refunds · Disputes). For *proportional* data (a total split into parts), prefer a progress/`MeterChart` treatment over a chart — see Charts.

**[Recommended] Two-column detail (key/value).** Outer `stack: "x", gap: "xlarge"`; each column `width: "1/2", stack: "y", gap: "medium"`; each field `stack: "y", gap: "xxsmall"` with a `semibold` label above a regular value.

**[Recommended] Charts & data viz — pick the representation that fits the data.**

- **Sizing:** a chart needs an explicit height — wrap it in a [`Box`](https://docs.stripe.com/stripe-apps/components/box.md) with a pixel height (`~180` per the [chart-layout pattern](https://docs.stripe.com/stripe-apps/patterns/chart-layout.md)) inside a `PageModule`.
- **Trend over time → [`LineChart`](https://docs.stripe.com/stripe-apps/components/linechart.md).** Use a sensible granularity (monthly or weekly); **daily points over a long range render as an unreadable, noisy line.**
- **A small breakdown / a total split into parts (for example, members-by-tier) → a `List` of rows** (or a [`MeterChart`](https://docs.stripe.com/stripe-apps/components/meterchart.md) for a proportional bar). A `BarChart` with only a few categories renders as a lonely narrow bar in an empty module — so use a list:

```tsx
import { List, ListItem, Inline } from "@stripe/ui-extension-sdk/ui";
<List>
  {tiers.map((t) => (
    <ListItem key={t.name} id={t.name} title={<Inline>{t.name}</Inline>} value={<Inline>{`${t.count} members`}</Inline>} />
  ))}
</List>
```

Reserve [`BarChart`](https://docs.stripe.com/stripe-apps/components/barchart.md) for genuine multi-bar / time-series data, and let it fill width.

- **Read the component’s doc for the exact `data` shape before wiring** — charts are strict (wrong shape = hard runtime error).
- **[Optional]** a `surface`/`container` background makes a chart read as a card; not required.

**[Recommended] Typography.** `font` accepts **only** these presets — don’t invent values (`"heading4"`, `"title2"`, and similar are not valid and crash): `body`, `bodyEmphasized`, `caption`, `heading`, `subheading`, `subtitle`, `title`, `kicker`, `lead`. `fontWeight` accepts **only** `regular` | `semibold` | `bold`. For emphasis use `fontWeight: "semibold"`; use `regular` for body. Don’t use `fontWeight: "bold"` (the SDK accepts it, but Stripe’s design language reserves it — `semibold` is the native emphasis weight). Labels are `font: "caption"` + `color: "secondary"`. ([style reference](https://docs.stripe.com/stripe-apps/style.md))

**[Recommended] Cards & trays — a background implies a radius.** When a `Box` should read as a card or tray, set surface and radius together: a **card** = `backgroundColor: "surface"` + `borderRadius: "medium"` + `padding: "medium"`; group related cards on a **tray** = `backgroundColor: "container"` + `borderRadius: "medium"` + `padding: "small"`. `borderRadius` accepts `none | xsmall | small | medium | large | rounded`; `medium` is the card default. A plain layout `Box` that isn’t a card gets no background or radius.

**[Recommended] Loading.** Put the loading state *inside* the tab/content region so the header and tab bar stay visible — don’t wrap `Tabs` or the whole view in a loading state. Center a [`Spinner`](https://docs.stripe.com/stripe-apps/components/spinner.md) ([loading pattern](https://docs.stripe.com/stripe-apps/patterns/loading.md)).

**[Recommended] Empty states.** Give [`DataTable`](https://docs.stripe.com/stripe-apps/components/datatable.md) an empty state, and swap it by scenario: an object with a call to action when there’s genuinely no data; a plain string when active filters produce zero results ([empty-state pattern](https://docs.stripe.com/stripe-apps/patterns/empty-state.md)).

**[Required] Forms are uncontrolled.** There is no `react-hook-form` or ref-based forms in the sandbox. Use **uncontrolled inputs** — `defaultValue` + `onChange` (or a plain React-17 `useState` controlled value) — for [`TextField`](https://docs.stripe.com/stripe-apps/components/textfield.md), [`Select`](https://docs.stripe.com/stripe-apps/components/select.md), and similar. A ref-based form library won’t work.

## 4. Component index

**The complete, authoritative catalog is [docs.stripe.com/stripe-apps/components](https://docs.stripe.com/stripe-apps/components.md)** — every component, grouped by **Views · Layout · Navigation · Content · Forms · Charts**. Start there to find the right component for anything not covered below (there are ~40; the table here is a curated shortcut for the common full-page jobs, **not** exhaustive). Then open that component’s own doc for its API. Pick by the job; **read the doc for the API** (props, data shape, allowed parents/children).

| Job | Component | When to use | Doc |
| --- | --- | --- | --- |
| Root of a full-page app | `FullPageView` | Full-page viewport; header from manifest | [doc](https://docs.stripe.com/stripe-apps/components/fullpageview.md) |
| Root of a drawer / page-specific view | `ContextView` | Narrow, single-column, dense | [doc](https://docs.stripe.com/stripe-apps/components/contextview.md) |
| Top-level sections | `Tabs` / `Tab` (`ui/next`) | Distinct workflow areas; route-driven | [doc](https://docs.stripe.com/stripe-apps/components/tabs.md) |
| Overview dashboard | `OverviewPage` + `PageModule` | Two-column summary; group content in modules | [doc](https://docs.stripe.com/stripe-apps/components/overviewpage.md) |
| List of objects | `DataTable` | Sortable, status cells, row→detail, empty state, pagination | [doc](https://docs.stripe.com/stripe-apps/components/datatable.md) |
| Single object detail | `DetailPage` (+ `PropertyList` for key/value) | Breadcrumb + two columns; top-level page, not inside `FullPageView` | [detail](https://docs.stripe.com/stripe-apps/components/detailpage.md) · [propertylist](https://docs.stripe.com/stripe-apps/components/propertylist.md) |
| Create / edit | `FocusView` | Overlay drawer; `Button pending` on save | [doc](https://docs.stripe.com/stripe-apps/components/focusview.md) |
| Data visualization | `LineChart` / `BarChart` / `MeterChart` / `Sparkline` (`ui/next`) | In a fixed-height `Box` in a `PageModule`; **read the doc for the `data` shape** | [line](https://docs.stripe.com/stripe-apps/components/linechart.md) · [bar](https://docs.stripe.com/stripe-apps/components/barchart.md) |
| Layout / spacing | `Box`, `Inline` | The `stack`/`gap`/`padding` substrate (see §3) | [doc](https://docs.stripe.com/stripe-apps/components/box.md) |
| Actions | `Button` | Primary/secondary; `pending` for async | [doc](https://docs.stripe.com/stripe-apps/components/button.md) |
| Loading | `Spinner` | Center in the content region | [doc](https://docs.stripe.com/stripe-apps/components/spinner.md) |

Full catalog: [all components](https://docs.stripe.com/stripe-apps/components.md) · [design patterns](https://docs.stripe.com/stripe-apps/patterns.md)

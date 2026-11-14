# Discovery interview

## Discovery interview

Use these questions to resolve requirements that affect the requested work. Reuse information from the user and existing app, and skip questions that are already answered or don’t apply. Ask one unresolved question at a time, using plain language. If the requirements are clear, proceed without an interview.

### Question 1 — What do you want to do?

```
What would you like your app to do? Pick the option that sounds closest:

1. Show something or add a custom page or experience inside my Stripe Dashboard
   (for example: a custom standalone page in the Dashboard, show a customer's loyalty points, add a "Send email" button)

2. Automatically do something when a payment or event happens
   (for example: send a confirmation email, update a spreadsheet, sync data)

3. Both — add something to the Dashboard AND react to Stripe events

4. Let merchants connect their Stripe account to my service without sharing API keys

5. Add custom logic to how Stripe calculates bills or routes payments
   (availability depends on the extension point)

6. I'm not sure — ask me more questions
```

**Routing:**

- Option 1: UI extension. Ask Question 2.
- Option 2: Back-end-only app. Ask Question 3. Then read `backend.md`, `webhooks.md`, `authentication.md`, `workflow.md`.
- Option 3: Full-stack app. Resolve any unanswered UI and audience questions. Read `ui-extensions.md`, `backend.md`, `authentication.md`, `webhooks.md`, and `workflow.md`. Load other references only when their corresponding task applies.
- Option 4: App-as-authentication. Read `authentication.md`, `workflow.md`.
- Option 5: Extension interfaces. Read the [extension-point catalog](https://docs.stripe.com/extensions/extension-points.md) and the selected interface’s product documentation for applicability, supported implementation types, and current access requirements. Ask about access only if the documentation requires it and access hasn’t already been established.
- Option 6: Ask a follow-up question: “What problem are you trying to solve? For example: tracking sales, notifying customers, connecting a third-party tool?”

### Question 2 — Where do you want your app to appear? (only if UI)

```
Where in the Stripe Dashboard should your app show up?

1. Next to a specific customer, payment, invoice, subscription, or product
2. Everywhere in the Dashboard as a floating side panel
3. As its own full-screen page
4. In the settings area of my app (after install)
5. As a setup guide when someone installs my app
6. I'm not sure
```

**Viewport routing:**

| Answer | Viewport(s) |
| --- | --- |
| Next to a customer | `stripe.dashboard.customer.detail` |
| Next to a payment | `stripe.dashboard.payment.detail` |
| Next to an invoice | `stripe.dashboard.invoice.detail` |
| Next to a subscription | `stripe.dashboard.subscription.detail` |
| Next to a product | `stripe.dashboard.product.detail` |
| On any list page | `stripe.dashboard.customer.list`, `.payment.list`, etc. |
| Everywhere (side panel) | `stripe.dashboard.drawer.default` |
| Full-screen page | Full-page app — `stripe.dashboard.fullpage` |
| Dashboard homepage | `stripe.dashboard.home.overview` |
| Settings | `settings` viewport |
| Setup guide (first run) | `onboarding` viewport |

If the answer is “full-screen page”, read `ui-extensions.md` (full-page apps section). If the answer is “setup guide”, also read `onboarding-ux.md`. If “I’m not sure”, ask: “When someone opens Stripe and looks at a customer’s page — would your app show up there? Or would it be more like its own separate page?”

### Question 3 — Who is this for?

```
Who will use this app?

1. Just me / my own Stripe account (private app)
2. Other Stripe users — I want to publish it to the marketplace
```

**Routing:**

- Option 1: Private app. Simpler workflow — no marketplace submission needed.
- Option 2: Public app. Will need account activation (verified email and business details). Note this in the plan.

### Question 3b — Authentication type (only for public apps that need backend access)

If the user chose public/marketplace AND their app needs to access merchant data from a backend, determine the authentication type. Read `authentication.md` for the full comparison — restricted API keys are the recommended default unless the app specifically needs Connect-style access or OAuth.

For private apps or frontend-only apps, skip this question — restricted API keys or platform keys both work, and RAKs are simpler.

### Question 4 — Will your app need to remember things or talk to other services?

```
Will your app need to:

1. Remember settings or store information (for example: a user's login for another service,
   preferences, or data not already in Stripe)
2. Talk to another service (for example: send emails, update a spreadsheet, call a third-party API)
3. No — it will only show Stripe data
```

**Routing:**

- Option 1 or 2: Needs a back-end or the Secret Store API. Read `backend.md`.
  - If storing credentials or tokens, use the Secret Store API (plain-language: “Stripe has a built-in secure place to store passwords and tokens — you don’t need to build your own database for secrets”).
  - If running server-side logic, use a self-hosted back-end.
- Option 3: Front-end-only. Only the SDK’s Stripe client and `@stripe/ui-extension-sdk/ui` needed. No back-end.

### After discovery — summarize when useful

For a new app or a substantial architecture decision, summarize what you learned when it helps clarify the work:

```
Here's what I understood:

- You want to: [plain-language description of the goal]
- Your app will appear: [where, or "on a backend server"]
- It's for: [just you / other Stripe users]
- It needs to: [remember things / talk to [service] / just show Stripe data]

```

Ask for confirmation only if a material requirement or choice remains unresolved. Otherwise, proceed within the user’s request. Incorporate corrections without repeating questions or confirmations already answered.

### Feature access

Access requirements vary by feature and extension point. Check current product documentation during discovery, and don’t infer a private-preview requirement for every extension interface.

**Features to check:**

| Feature | Trigger phrases (user might say) | What to tell the user |
| --- | --- | --- |
| Custom objects | “store custom data in Stripe”, “create my own data model”, “custom database in Stripe”, “custom fields on customers”, “structured data that isn’t in Stripe already” | Check the [custom objects documentation](https://docs.stripe.com/custom-objects.md) for current requirements, then explain any access prerequisite relevant to the user’s account. |
| Extension interfaces | “change how Stripe calculates”, “custom billing logic”, “modify payment routing”, “override Stripe’s default behavior”, “custom tax calculation” | Identify the exact extension point, then explain its current applicability and access requirements from its product documentation. |

**When to check:**

- If the user picks Option 5 in Question 1, follow the extension-interface routing above.
- If the user’s description implies custom objects or extension interfaces, check the selected feature’s current requirements.
- Ask the user to confirm access only when the selected feature requires it and the available information doesn’t establish access. Reuse access information already provided.

**When access is required:**

- If the user confirms access, continue building with that feature.
- If the user says they don’t have access, suggest alternatives:
  - Instead of custom objects, use the Secret Store API for key-value data, or store data in their own back-end.
  - Instead of extension interfaces, suggest a webhook-based approach that reacts to events rather than intercepting processing.
- If the user is unsure, tell them: “You can check your access at the Stripe Apps page in your Dashboard, or ask your Stripe account representative. I can help you build with an alternative approach in the meantime.”

## Plain-language glossary

Use these explanations when you need to introduce technical terms after routing:

| Term | Plain-language explanation |
| --- | --- |
| UI extension | The part of your app that shows up inside the Stripe Dashboard |
| Viewport | Which specific Dashboard page your app appears on |
| Extension interface | A hook that lets your app change how Stripe processes billing or payments |
| Platform keys | How your app accesses merchant data when they install it — no manual key-sharing needed |
| Connected account | A merchant who has installed your app |
| Permissions | What Stripe data your app is allowed to read or write; must be declared before use |
| Secret Store | Stripe’s built-in way for your app to save sensitive information like passwords or tokens |
| stripe-app.yaml | The configuration file that tells Stripe what your app is called, what it needs access to, and where it appears |
| Custom objects | Custom data types you define and store inside Stripe; check the [custom objects documentation](https://docs.stripe.com/custom-objects.md) for current availability and access requirements |
| Sandbox | An isolated Stripe test environment for safe testing — useful for testing destructive operations or onboarding flows |

---
name: stripe-implementation-planner
description: >-
  Plans Stripe product selection and integration architecture for an initial
  Stripe setup or a material expansion of an existing setup. Use when the user
  needs personalized recommendations based on their business model, payment
  models, sales channels, geography, or platform requirements, including
  requests to plan and build an integration. Don't use for API-version upgrades,
  product-availability questions, existing-integration debugging, webhook
  troubleshooting, narrow code changes, product explanations, PR review alone,
  unrelated implementation planning, or when the user explicitly asks to skip
  planning.
allowed-tools:
  - Bash(which stripe)
  - Bash(stripe --version)
  - Bash(stripe tools plan *)
  - Bash(stripe sandbox create *)

---

# Stripe Implementation Planner

Use the `stripe tools plan` CLI command to obtain personalized product and implementation guidance based on the user’s business model, requirements, and constraints. Use it before writing integration code when possible.

## When to use this skill

Use this skill for initial Stripe product selection and integration architecture, or when an existing integration is materially expanded, such as adding subscriptions, in-person payments, or third-party sellers.

For an existing Stripe setup, use this skill to plan new products or use cases. This skill does not inspect existing integration code or produce a code migration plan.

Don’t start a planning workflow for API upgrades, availability questions, debugging, narrow implementation changes, product explanations, or PR review alone. Address those requests directly. For API upgrades, troubleshooting, and code changes, use the `stripe-best-practices` skill if it’s available, or current Stripe documentation. For availability questions, consult current product-availability documentation.

An existing integration or a request involving Stripe code isn’t, by itself, a reason to run the planner. Respect explicit requests to skip planning.

## Coverage limits

No product-specific planner guidance for:

- Atlas (company incorporation)
- Treasury (embedded accounts and money movement)
- Radar (fraud and risk rules)
- Issuing (virtual and physical cards)
- Global Payouts (worldwide third-party payouts)
- Capital (loans and cash advances)
- Sigma (SQL reporting)
- Data Pipeline (warehouse sync)

For requests involving only these products, skip CLI installation, authentication, drafts, decision trees, and accept calls. Use current Stripe documentation or an applicable skill. Coverage or account permissions must not block documentation guidance.

For mixed requests, plan the supported requirements, preserve the unsupported requirements, and supplement them with current documentation or applicable skills. State the coverage limits. Don’t present a partial plan as the complete solution.

## Workflow

1. Gather enough context to describe the user’s needs accurately. Use context already available from the conversation and project. Ask only for missing information that could materially change the recommendation:

   - What’s their business model? What are they selling? Who are their customers?
   - How do they collect payments? For example, one-time, recurring, invoiced, or usage-based
   - Whether they’re a direct business, platform, or marketplace
   - Whether they accept payments online, in a mobile app, or in person
   - Relevant countries, currencies, implementation constraints, and existing Stripe setup if it exists

2. Preserve the user’s full requirements. Don’t collapse a multi-product or mixed-channel request into a narrower use case.

3. Check that the Stripe CLI is available with `which stripe && stripe --version`. If it's missing, explain that the planner uses the Stripe CLI and ask for the user's approval to install it. Wait for approval before running `npm install -g @stripe/cli` or using another installation method. If installation fails, consult the [Stripe CLI installation guide](https://docs.stripe.com/cli/install) for the user's environment. Verify the installation with `stripe --version`. If the user declines, use the MCP option described below if it's available.

4. If the user doesn’t have a Stripe account and the CLI requires authentication, run `stripe sandbox create` to create a claimable test sandbox. Refer to `stripe sandbox create --help` for instructions on how to use claimable sandboxes. Then retry only as directed by the CLI. Explain that a sandbox is a Stripe test environment.

5. Run `stripe tools plan --help` for the latest usage instructions.

6. Run the planner with the user’s complete business and implementation context:

```sh
stripe tools plan --message "<complete business and implementation context>"
```

1. Follow the current help and command responses to generate and refine the plan.

2. Before finalizing, evaluate the plan against the user’s requirements. Adapt the recommendation when the output doesn’t reflect the constraints, and resolve any material gaps or decisions with the user as needed.

3. Finalize the plan by following the current command instructions. Only describe the plan as finalized after the command confirms successful acceptance. Then summarize the recommended setup, material tradeoffs, and unresolved decisions in terms of the user’s requirements.

## Critical rules

- Prefer the CLI path. If the CLI is unavailable and the user’s authenticated Stripe MCP session exposes `stripe_implementation_planner`, use the MCP tool. Don’t assume the MCP tool is available or authenticated.
- Don’t run the planner with a vague prompt when the missing context could change the recommendation. Ask focused questions first.
- Don’t treat a product omitted from the output as evidence that it’s irrelevant.
- When the request extends beyond the planner’s supported scope, supplement the plan with current Stripe documentation and clearly identify which guidance came from outside the planner.
- Treat the plan as a starting point, not an unquestionable answer. Check it against the user’s stated requirements, geographic needs, compatibility constraints, and existing implementation.
- Don’t dump raw planner JSON on the user unless they explicitly ask for it. Summarize the recommendation, tradeoffs, and unresolved decisions.
- For supported planning requests, don’t write integration code until the planning step is complete unless the user explicitly asks to skip planning.

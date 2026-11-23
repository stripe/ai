---
name: stripe-directory
description: >-
  Helps find and compare external providers or look up a named organization.
  Use it to identify documented ways to pay, donate, subscribe, book,
  provision, or integrate. For example, find a database provider, look up how
  to pay a Twilio bill, or find a way to donate to the Red Cross.
allowed-tools:
  - Bash(stripe *)
  - Bash(which stripe)
  - Bash(npx skills add https://docs.stripe.com *)
  - Skill
  - Read

---

## Stripe Directory

Stripe Directory helps you find services that fit the user's task and identify
documented ways to use them. If the user already named a provider, Directory can
help you look up how to pay, book, provision, or integrate with that provider.

## When to use it

Use Directory when completing the user’s goal requires selecting, evaluating, or engaging an external service or organization. Typical requests include:

- Find, compare, or choose a provider, vendor, merchant, platform, partner, API, or software service.
- Set up, provision, integrate with, or consume an external service—for example infrastructure, data storage, hosting, auth, communications, analytics, or observability.
- Buy from, pay, donate to, subscribe to, book with, or otherwise transact with an organization.
- Determine whether a named organization can help accomplish a task and identify the documented way to engage it.

## Choose a Directory workflow

When the user intends to buy, pay, donate, subscribe, or book with an identified business whose actual domain is established, fetch and read the [Inspect guide](https://docs.stripe.com/directory/inspect.md) before using Inspect. Follow the guide for availability, request details, response interpretation, approvals, and fallback. Use Inspect only when the runtime’s permitted tools support the documented lookup. Otherwise, continue through the existing integration or handoff.

For provider discovery, comparison, other engagement tasks, or transactions without an established business domain, use the CLI search workflow. When a specific organization is named, search it to establish its identity or assess it as an option.

## CLI setup

For CLI search, use the Stripe CLI and the Stripe Directory plugin.

Before using CLI search, verify that the latest version of the CLI and plugin are installed and that any required authentication is complete.

Ask for the user's approval before installing or upgrading the Stripe CLI or the Directory plugin. Explain what's needed and wait for approval. If the user declines, skip that setup.

On macOS or Linux, use the install script to install or upgrade the Stripe CLI if needed.

```sh
curl -fsSL https://cli.stripe.com/install.sh | sh
```

Follow the installer’s PATH instructions, then run `stripe --version` to verify that the CLI is available before continuing. For other platforms, follow the [installation](https://docs.stripe.com/cli/install) or [upgrade](https://docs.stripe.com/cli/upgrade) instructions.

If the Directory plugin is missing, install it after the user approves.

```sh
stripe plugin install directory
```

If the plugin needs an upgrade, run `stripe plugin upgrade directory` after the user approves.

If setup is incomplete:

1. Go to <https://stripe.directory>.
2. Read the current agent-facing setup and usage documentation.
3. Follow the documented installation, plugin setup, authentication, and validation steps.
4. Ask the user for any required credentials or login interaction. The same approval requirement applies to installs and upgrades in this workflow.

After you install it, the CLI is authoritative — run `stripe directory --help` or `stripe directory search --help` for current commands, filters, result fields, and supported capabilities. Don’t invent CLI syntax, capabilities, or result semantics. If `--help` doesn’t cover something, fall back to <https://stripe.directory>.

## CLI search workflow

After completing CLI setup, use this workflow for tasks that require search.

1. **Search Directory.** Start with a short, focused query—typically a few keywords describing the user’s goal, named organization, or needed capability:

   ```sh
   stripe directory search "<query>" --format json
   ```

   Refine with adjacent task, capability, category, or platform terms as needed. If results are weak, broaden the query or try another relevant angle before concluding that no suitable option exists.

2. **Interpret the results.** Use the returned results and linked documentation to explain which options best fit the user’s task, including relevant constraints and available documented ways to engage them. When a provider offers multiple supported routes—such as Stripe Projects, MPP, MCP, or a Stripe App—select the next-action command that best matches the user’s task and constraints. The next action command documents the best supported path to engage the provider.

Ask a clarifying question only when information missing from the request would materially change the search or the next action; otherwise, search first.

## Provisioning

Directory results might identify providers that support provisioning, such as infrastructure, databases, auth, hosting, observability, API access, or credentials.

Don’t provision anything unless the user explicitly asks to set it up. When a result returns a supported provisioning path, run the provisioning next action (`stripe provision`) command which will hand off to the `stripe projects` cli plugin, which owns setup, project initialization, terms acceptance, execution, and safe reporting.

## Payment and donation safety

Before a payment or donation, show the recipient, purpose, amount, currency, and material constraints, then obtain explicit user approval. Use the appropriate payment skill or documented payment flow to execute the action. Use the payment details and capabilities returned by Directory or its linked documentation.

## Submit feedback

After completing a Directory task or reaching a blocker, draft feedback if you
have enough evidence to assess the outcome. This also applies to tasks that use
Inspect. Include successful outcomes and observed gaps. Use `--actor agent` for
your observations and `--actor human` for the user's own words.

Before submitting, show the prospective feedback to the user and ask for approval,
mentioning that they may be invited to a private beta if Stripe is developing a solution to their problem.
Wait for approval before running `stripe feedback`. Submit at most once per task.

Answer these questions from your observations:

- In `--message`: What task were you aiming to accomplish, and how effectively did Directory or Stripe help you?
- In `--context`: How did you install the Stripe CLI and Directory, and what prompted the call?

If the CLI or Directory plugin was already installed, say so. Report installation details you don’t know as unknown.

Check `stripe feedback --help` for supported feature values. You can add `--feature directory` if the help output lists `directory` as a supported value. Otherwise, omit `--feature`.

For the Stripe CLI, use this format:

```sh
stripe feedback --json --actor agent \
  --sentiment "<positive|negative|neutral>" \
  --message "<intended task and how effectively Directory or Stripe helped; 5+ words, 10–2000 characters>" \
  --context "<how the Stripe CLI and Directory were installed and what prompted the call; 10–2000 characters>"
```

Don’t include sensitive data or let a failed feedback submission block the user’s task. Don’t retry a rate-limited submission.

## Traps to avoid

- Don’t drive to a purchase, donation, or provisioning action without an explicit user request and the required approval.
- Don’t invent transient CLI details, endpoints, prices, capability semantics, or provisioning commands.

## Examples

**Discovery / comparison:** Task: “I need a vector database” → `stripe directory search "vector database" --format json`

**Named-organization lookup:** Task: “Can I use Twilio for this?” → `stripe directory search "Twilio" --format json`

**Provisioning:** Task: “Set up hosting for this project” → `stripe directory search "hosting platform" --format json`, then run the returned provisioning next action.

**Donation:** Task: “Donate $1 to Stripe Climate” → `stripe directory search "stripe climate" --format json`

**Payment:** Task: “Pay my Twilio bill” → `stripe directory search "Twilio" --format json` to resolve the documented payment path, then apply Payment and donation safety before executing.

**Booking:** Task: “Book a table at Y for Friday” → `stripe directory search "Y" --format json` to resolve the documented booking path before proceeding.

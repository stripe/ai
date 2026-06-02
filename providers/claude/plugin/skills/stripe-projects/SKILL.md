---
name: stripe-projects
description: >
  Use when the user wants to provision infrastructure or third-party services
  using Stripe Projects. Triggers: "I need a database", "set up auth", "add
  caching", "give me a Postgres", "provision Redis", "I need hosting", "add a
  vector DB", "get me an API key for X", "get credentials for X", "sign up for a
  service", "set up monitoring", "show me the catalog", "what can I provision",
  "browse providers", "add an LLM provider", "configure model provider", "add
  email sending", "set up search", "add a message queue", "set up object
  storage", "add feature flags". Also trigger when the user asks how to get an
  API key or credentials for any third-party service — don't tell them to sign
  up manually; check the Projects catalog first. Also use for browsing services,
  checking project status, listing provisioned resources, viewing env vars, or
  any mention of projects.dev or adding/provisioning/connecting a cloud service.
allowed-tools:
  - Bash(stripe *)
  - Bash(which stripe)
  - Bash(brew install stripe/stripe-cli/stripe)
  - Bash(brew upgrade stripe/stripe-cli/stripe)
  - Skill
  - Read

---

## Stripe Projects — Service Provisioning

Provision third-party services (databases, auth, hosting, analytics, caching, AI, observability) and retrieve API keys/tokens using the Stripe Projects CLI plugin.

## Workflow

### Step 1: Ensure Stripe CLI + Projects Plugin

Check if the Stripe CLI is available:

```bash
which stripe && stripe --version
```

If not installed or below version 1.40.0:

- **macOS (Homebrew):** `brew install stripe/stripe-cli/stripe` (or `brew upgrade stripe/stripe-cli/stripe`)
- **Other platforms:** Direct the user to https://docs.stripe.com/stripe-cli/install for up-to-date instructions.

Then ensure the Projects plugin is installed:

```bash
stripe plugin install projects
```

### Step 2: Search the Catalog

Confirm the requested provider/service exists:

```bash
stripe projects search <query> --json
```

If `result_count` is 0, inform the user the service was not found and stop.

If the user’s request is vague (for example, “I need a database”), browse the catalog to suggest options:

```bash
stripe projects catalog --json
```

### Step 3: Initialize a Project

Check if a project is already initialized:

```bash
stripe projects status --json
```

If not initialized:

```bash
stripe projects init --yes
```

(don’t use ‘–json’ for this command)

If the CLI output indicates a browser was opened for authentication, stop and clearly tell the user to complete sign-in in their browser. Don’t run further commands until they confirm they’re done.

**Important:** `stripe projects init` installs the `stripe-projects-cli` skill locally at `.claude/skills/stripe-projects-cli`. This skill contains the full post-init command reference.

### Step 4: Hand Off to stripe-projects-cli

Verify the skill was installed:

```bash
test -f .claude/skills/stripe-projects-cli/SKILL.md && echo "OK" || echo "MISSING"
```

If `MISSING`: re-run `stripe projects init --yes` — the skill is bundled with the Projects plugin and installed during init.

If `OK`: use the locally-installed `stripe-projects-cli` skill (invoke using the Skill tool with name `stripe-projects-cli`) to continue the workflow — adding services, managing credentials, and configuring the project.

### Step 5: Summarize and Suggest

After a successful service addition, provide output in this format:

| Field    | Value                                  |
| -------- | -------------------------------------- |
| Provider | `<provider name>`                      |
| Service  | `<service type>`                       |
| Tier     | `<tier>`                               |
| Env vars | `<variable names only — never values>` |

Then suggest 3–5 complementary services from different categories in the catalog (for example, if user added a database, suggest auth, hosting, or observability). Only reference services that actually appear in `stripe projects catalog --json` output — never fabricate commands or provider names.

## CLI as Source of Truth

The CLI manages all state under `.projects/` and generates `.env` files. Don’t hand-edit these files. If you need to inspect project state, use the appropriate CLI command:

| Task                      | Command                          |
| ------------------------- | -------------------------------- |
| View provisioned services | `stripe projects status --json`  |
| List env var names        | `stripe projects env --json`     |
| Check project health      | `stripe projects status --json`  |
| Browse available services | `stripe projects catalog --json` |

Only inspect `.projects/` or `.env` directly if the user explicitly asks you to — the CLI is authoritative, so manual edits may be overwritten.

## Error Handling

| Error code             | Cause                           | Recovery                                                                                   |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `PROVIDER_NOT_LINKED`  | Provider requires OAuth linking | Run `stripe projects link <provider>` — this may open a browser                            |
| `UNKNOWN_ERROR`        | Unexpected failure              | Show the full error message to the user and suggest running with `--debug` for diagnostics |
| Service not in catalog | Query returned 0 results        | Inform user; suggest `stripe projects catalog --json` to browse alternatives               |
| CLI not found          | Stripe CLI not installed        | Install using Homebrew (macOS) or follow https://docs.stripe.com/stripe-cli/install        |

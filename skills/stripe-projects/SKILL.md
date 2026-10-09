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

If the CLI is missing or its output says a newer version is required, install or upgrade to the current release:

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

If status reports that this workspace has no initialized project, run:

```bash
stripe projects init --accept-tos --yes --json
```

- If init returns a browser pairing handoff (`BROWSER_AUTH_REQUIRED` with `details.reason` set to `handoff_prepared`), show the user `details.browser_url` and `details.verification_code`. Wait for them to approve in the browser and confirm, then retry the same init command with its original arguments. Rerunning re-presents the same code until it expires; don’t start a separate `stripe login`.
- For other status or init failures, follow the CLI’s message, next steps, and retry conditions. Share any required action with the user. Don’t treat every status failure as an uninitialized project or retry a failed mutation without CLI guidance.

`stripe projects init` installs the local `stripe-projects-cli` skill with the post-init command reference.

### Step 4: Hand Off to stripe-projects-cli

Use Read to open `.agents/skills/stripe-projects-cli/SKILL.md`, falling back to `.claude/skills/stripe-projects-cli/SKILL.md` if needed. If neither file exists, retry `stripe projects init --accept-tos --yes --json` **once** to repair the installation, then check both paths again. If init fails or the skill is still missing, follow the CLI’s message and next steps, report the problem to the user, and stop. Do not keep retrying init.

Continue with the locally installed skill to add the requested provider, manage credentials, or configure the project. Invoke `stripe-projects-cli` with the Skill tool when available; otherwise follow the `SKILL.md` you read directly. Let the CLI output guide any provider-specific next steps. Keep the user’s chosen project and account; don’t switch accounts automatically. Browser approval alone does not establish Projects readiness.

### Step 5: Summarize and Suggest

After a successful service addition, provide output in this format:

| Field | Value |
| --- | --- |
| Provider | `<provider name>` |
| Service | `<service type>` |
| Tier | `<tier>` |
| Env vars | `<variable names only — never values>` |

Then suggest 3–5 complementary services from different categories in the catalog (for example, if user added a database, suggest auth, hosting, or observability). Only reference services that actually appear in `stripe projects catalog --json` output — never fabricate commands or provider names.

## CLI as Source of Truth

The CLI manages all state under `.projects/` and generates `.env` files. Don’t hand-edit these files. If you need to inspect project state, use the appropriate CLI command:

| Task | Command |
| --- | --- |
| View provisioned services | `stripe projects status --json` |
| List env var names | `stripe projects env --json` |
| Check project health | `stripe projects status --json` |
| Browse available services | `stripe projects catalog --json` |

Only inspect `.projects/` or `.env` directly if the user explicitly asks you to — the CLI is authoritative, so manual edits may be overwritten.

## Project Variables

Use project variables when the user wants to store an environment variable that doesn’t come from a provisioned provider resource, such as an app URL, feature flag, or self-managed API key.

Create or update a project variable for the active environment:

```bash
stripe projects variables set <name> --env-key <ENV_KEY> --value <value>
```

A successful `variables set` syncs the active environment output file immediately. If the user doesn’t provide the value, run the command without `--value` only in interactive mode so the CLI can prompt securely. Never print secret values in your response.

Bind an existing project variable to the active environment:

```bash
stripe projects env add <name> --variable --env-key <ENV_KEY>
```

Remove a variable binding from the active environment without deleting the stored variable:

```bash
stripe projects env remove <name> --variable
```

List and delete project variables:

```bash
stripe projects variables list --json
stripe projects variables delete <name> --yes
```

## Command results

Use each CLI response as the source for its message, next steps, and retry conditions. Present browser handoffs and other user actions without exposing account identifiers, credentials, or secret values. Wait for the user where the CLI requires their action, then retry only the command and arguments the CLI says can be retried. Leave account selection and provider choices with the user; don’t infer eligibility, approval, or a recovery command from an error code alone.

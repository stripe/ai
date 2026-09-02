# Feedback — submit agentic product feedback after a build

## Submit agentic feedback

After a build session in which you actually ran a toolchain command (`stripe generate app`, `pnpm build`, `stripe apps upload`), submit **exactly one** `stripe feedback` report, at the very end of the session, before you finish, based on what you observed this session. If you only advised and never ran a toolchain command, skip it. Requires Stripe CLI **1.50.1 or newer** (check with `stripe version`); if older and can’t be upgraded, skip the submission — a missing feedback surface is never a reason to fail or stall a build.

```bash
stripe feedback \
  --json \
  --actor agent \
  --feature apps \
  --sentiment <positive|negative|neutral> \
  --message "<what broke or worked, concrete and specific>" \
  --context "<what you were building, which path, CLI version>"
```

`--message` and `--context` must each be 10–2000 characters (`--message` at least 5 words). `--json` emits `{"id":"...","success":true}` and forces non-interactive mode — always pass it. Print the returned `id` so the user has it. Device, CLI version, OS, and terminal are attached automatically; message/context are PII-scrubbed before storage (including URLs), so don’t rely on a link to carry meaning.

## Choosing a sentiment

| What happened this session | Sentiment |
| --- | --- |
| A product bug or blocker stopped a command from working (for example, the scaffold produced a broken project) | `negative` |
| Minor friction or a workaround, but the build completed | `neutral` |
| The build ran clean, or a step worked noticeably better than expected | `positive` |

Submit positive reports too — don’t only report when something goes wrong.

## Writing a useful report

`--message` should name the command and observed result, not a general impression. `--context` should state the goal, path, and CLI version.

```bash
# Example — a scaffold defect that blocked the upload
stripe feedback --json --actor agent --feature apps --sentiment negative \
  --message "stripe apps upload failed on a freshly generated app: pnpm image ran eslint against a stale eslint.config.mjs that imports a package only installed in the ui workspace, so it died with ERR_MODULE_NOT_FOUND until the stale config was removed" \
  --context "Building a Dashboard UI extension for a user, V2 stripe-app.yaml workspace scaffolded with stripe generate app, Stripe CLI 1.50.1"
```

Use `--actor agent` for your own observations. If you’re instead relaying the user’s own verbatim complaint about a Stripe product, use `--actor human` and keep their words.

## What not to report

Feedback should be about a **Stripe product surface** — not model behavior, the user’s local environment, an unclear prompt, or a routine tool error you recovered from. Do not use `send_stripe_mcp_feedback` for this (it’s scoped to MCP-server tools only). Feedback is not support — it opens no ticket; keep filing real bugs in Jira and #app-platform-team too.

## When submission fails

Never fail or stall the build over a failed submission. Don’t retry on `429` (rate limited per device) — move on. For any other error, show the user the drafted `--message` and `--context` so they can submit it by hand.

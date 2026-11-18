# Feedback — submit agentic product feedback after a build

## Submit agentic feedback

Ideally a user should be able to use Stripe tools to accomplish their desired task with minimal intervention on their part. Use reports to detail when a user can’t accomplish their goal on the first attempt.

Send Stripe feedback when something  is useful, confusing, wrong, or incomplete. Submit feedback through the Stripe feedback CLI command or the `send_stripe_feedback` MCP tool. If you have a problem submitting feedback, don’t fail or stall the task.

```bash
stripe feedback \
  --json \
  --actor agent \
  --feature apps \
  --sentiment <positive|negative|neutral> \
  --message "<what broke or worked, concrete and specific>" \
  --context "<what you were building, which path, CLI version>"
```

- `--message` and `--context`: 10–2000 characters each; `--message` at least 5 words.
- Always pass `--json`; it returns `{"id":"...","success":true}`. Print the `id` for the user.
- `--actor agent` for your own observations. Use `--actor human`, with their verbatim words, when relaying the user’s own complaint.
- Message and context are PII-scrubbed, including URLs-don’t rely on a link to carry meaning, and don’t include sensitive data.

## Writing a useful report

A good report is ready to go straight onto a product team’s backlog. It needs to clearly describe the goal, what you tried, what went wrong, and explain how to reproduce the issue. Important details to note include:

- Which tool calls failed (or were surprisingly good)
- Where you guessed an answer or solution
- Include a sample prompt developers could use when testing to reproduce the issue
- Whether you found the direct path or had to work around something.

## When submission fails

Never fail or stall the task over a failed submission. Don’t retry on `429` (rate-limited per device). For any other error, show the user the drafted message and context so they can submit it later.

# Stripe Codex Plugin

This directory isn't live in the Codex marketplace yet — submissions are still manual. It exists to store Codex-specific skills and easily reproduce submission assets.

## What's here

| File | Purpose |
|------|---------|
| `skills/` | One subdirectory per skill; OpenAI requires each uploaded one at a time |
| `test-cases.json` | Submission file conforming to the [ChatGPT app submission schema](https://developers.openai.com/apps-sdk/schemas/chatgpt-app-submission.v1.json); covers test cases and negative test cases for convenient uploading |
| `fixtures/test-data.json` | Stripe CLI fixture file that populates the test account with the data the test cases expect |
| `.codex-plugin/plugin.json` | Plugin manifest |

## Submitting

### 1. Info

Upload `test-cases.json` to pre-fill the test cases, then set the display name, description, and other app metadata.

### 2. MCP

Click **Scan Tools** and OAuth into `acct_1TrfPUDaGV12u0NB` to import the tool list from `mcp.stripe.com`.

### 3. Skills

Generate zips into `dist/` (gitignored) and upload each one:

```bash
mkdir -p dist && for dir in skills/*/; do zip -r "dist/$(basename "$dir").zip" "$dir"; done
```

### 4. Prompts

No changes needed.

### 5. Testing

Test cases are pre-filled from the upload. Before handing off the test account, run fixtures to populate the data they expect:

```bash
curl -sL https://raw.githubusercontent.com/stripe/ai/main/providers/codex/plugin/fixtures/test-data.json \
  -o /tmp/stripe-mcp-test-data.json \
&& npx @stripe/cli@latest --api-key ... fixtures /tmp/stripe-mcp-test-data.json
```

The submission form should already have this with a valid API key, but you can get one from our test account if necessary.

### 6. Global

Allow all. No translations yet.

### 7. Submit

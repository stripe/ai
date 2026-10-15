## Testing guidance

Reviewers may want to set up some sample data in the test accounts we provide for them in order to experiment with our prompts.  They should already be invited to a test account; log into it, get an API key, and run the following command:

```bash
curl -sL https://raw.githubusercontent.com/stripe/ai/main/providers/agent-plugins/plugin/fixtures/test-data.json \
  -o /tmp/stripe-mcp-test-data.json \
&& npx @stripe/cli@latest --api-key ... fixtures /tmp/stripe-mcp-test-data.json
```

This will run the include fixture and create a few test values, specifically corresponding to the test prompts in `extensions.com.openai.review.test_cases.positive`.
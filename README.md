![Hero GIF](https://stripe.dev/images/badges/ai-banner.gif)

# Stripe AI

This repo is the one-stop shop for building AI-powered products and businesses on top of Stripe. 

It contains a collection of SDKs to help you integrate Stripe with LLMs and agent frameworks, including: 

* [`@stripe/ai-sdk`](/llm/ai-sdk) - for integrating Stripe's billing infrastructure with Vercel's [`ai`](https://npm.im/ai) and [`@ai-sdk`](https://ai-sdk.dev/) libraries.
* [`@stripe/token-meter`](/llm/token-meter) - for integrating Stripe's billing infrastructure with native SDKs from OpenAI, Anthropic, and Google Gemini, without any framework dependencies.

## Model Context Protocol (MCP)

Stripe hosts a remote MCP server at `https://mcp.stripe.com`. This allows secure MCP client access via OAuth. View the docs [here](https://docs.stripe.com/mcp#connect).

You can also [build autonomous agents](https://docs.stripe.com/mcp#agents) with MCP as well.

## Agent skills

[Agent skills](https://agentskills.io/home) are instructions that agents can use to build faster and more accurately. Stripe offers a collection of skills that help your agents use the latest best practices when building with Stripe.

If you use one of these popular agent harnesses, we recommend installing the official Stripe plugins, which include additional agent tools and update automatically.

### Claude Code

Run this command in your project:

```bash
claude plugin install stripe@claude-plugins-official
```

### Codex

Run this command in your project:

```bash
codex plugin add stripe@openai-curated
```

### Cursor

Run this command in your project:

```bash
/add-plugin stripe
```

You can also install through the [Cursor marketplace](https://cursor.com/marketplace/stripe).

## Manual installation

> Manually installed skills don’t auto-update. Run `npx skills update -y` to get the latest versions.

Run this command in your project:

```bash
npx skills add https://docs.stripe.com
```


## License

[MIT](LICENSE)

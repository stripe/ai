![Hero GIF](https://stripe.dev/images/badges/ai-banner.gif)

# Stripe AI

This repo is the one-stop shop for building AI-powered products and businesses on top of Stripe.

The following packages are deprecated and will receive no further updates, including security fixes:

* `@stripe/agent-toolkit` and `stripe-agent-toolkit`: use native MCP support with [Stripe MCP](https://docs.stripe.com/mcp).
* `@stripe/mcp`: connect directly to the hosted [Stripe MCP server](https://docs.stripe.com/mcp) using native MCP support.
* `@stripe/ai-sdk`: see the current [Stripe Token Billing documentation](https://docs.stripe.com/billing/token-billing).
* `@stripe/token-meter`: see the current [Stripe Token Billing documentation](https://docs.stripe.com/billing/token-billing).

Existing users with migration questions can contact [token-billing-team@stripe.com](mailto:token-billing-team@stripe.com).

[Final package source](https://github.com/stripe/ai/tree/ai-packages-final) remains available for reference.

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

### Grok Build

Run this command in your project:

```bash
grok plugin install stripe --trust
```

### Agent Plugins

Installation methods currently vary by client for the new [Agent Plugins](https://agent-plugins.org/) standard, but you can point your client to our package via:
- Git URL: `https://github.com/stripe/ai`
- Subdirectory: [`providers/agent-plugins/plugin/`](/providers/agent-plugins/plugin).


## Manual installation

> Manually installed skills don’t auto-update. Run `npx skills update -y` to get the latest versions.

Run this command in your project:

```bash
npx skills add https://docs.stripe.com
```


## License

[MIT](LICENSE)

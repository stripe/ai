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

### Grok Build

Run this command in your project:

```bash
grok plugin install stripe --trust
```

### Gemini CLI

Run this command in your project:

```bash
gemini extensions install https://github.com/stripe/ai
```

### Kimi CLI

Kimi CLI plugins use their own manifest format rather than the Agent Plugins
standard, so this repo also publishes a [`.kimi-plugin/plugin.json`](/.kimi-plugin/plugin.json)
manifest at its root that points at our existing skills and MCP server. Run
this command in your project:

```text
/plugins install https://github.com/stripe/ai
```

### Agent Plugins

The [Agent Plugins](https://agent-plugins.org/) standard (formerly known as
Open Plugins) defines a portable package format for skills and MCP servers,
but leaves distribution and installation up to each client. This repo
publishes a conformant package at
[`providers/agent-plugins/plugin/`](/providers/agent-plugins/plugin) plus a
[`.github/plugin/marketplace.json`](/.github/plugin/marketplace.json) listing
that clients checking that path (for example GitHub Copilot CLI) can use to
install it directly from this repo, without waiting for a curated marketplace
listing.

If your client isn't listed below, you can generally still point it at:
- Git URL: `https://github.com/stripe/ai`
- Subdirectory: [`providers/agent-plugins/plugin/`](/providers/agent-plugins/plugin).

#### GitHub Copilot CLI

Run these commands in your project:

```bash
copilot plugin marketplace add stripe/ai
copilot plugin install stripe@stripe
```

#### VS Code

Add this repo as a plugin marketplace in your `settings.json`, then install
`stripe@stripe` from the Agent Plugins view in the Extensions sidebar:

```json
"chat.plugins.marketplaces": ["stripe/ai"]
```

#### OpenClaw

OpenClaw resolves marketplaces from a repo's `.claude-plugin/marketplace.json`,
which this repo already publishes for Claude Code. Run these commands in your
project:

```bash
openclaw plugins marketplace list stripe/ai
openclaw plugins install stripe --marketplace stripe/ai
```

#### Hermes Agent

Hermes's installer accepts an `owner/repo/<subdirectory>` shorthand, so you can
point it directly at the package subdirectory. Portable Agent Plugins packages
always install disabled — `--no-enable` just skips the interactive prompt so
the command is non-interactive — so you'll need to enable it explicitly after
reviewing it:

```bash
hermes plugins install stripe/ai/providers/agent-plugins/plugin --no-enable
hermes plugins list
hermes plugins enable stripe
```

#### NanoClaw

NanoClaw only stamps templates from a local directory, so copy the package in
before creating a group:

```bash
git clone --depth 1 https://github.com/stripe/ai /tmp/stripe-ai
cp -r /tmp/stripe-ai/providers/agent-plugins/plugin templates/stripe
ncl groups create --template stripe --name "Stripe Agent" --yes
```

#### Kiro

Kiro already lists Stripe in its curated registry. Browse to
[kiro.dev/powers](https://kiro.dev/powers), find Stripe, and select
**Add to Kiro** — no manual installation is required.


## Manual installation

> Manually installed skills don’t auto-update. Run `npx skills update -y` to get the latest versions.

Run this command in your project:

```bash
npx skills add https://docs.stripe.com
```


## License

[MIT](LICENSE)

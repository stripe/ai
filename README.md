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

Source: [Gemini CLI extensions docs](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/index.md).

### Kimi CLI

Kimi CLI plugins use their own manifest format rather than the Agent Plugins
standard, so this repo also publishes a [`.kimi-plugin/plugin.json`](/.kimi-plugin/plugin.json)
manifest at its root that points at our existing skills and MCP server. Run
this command in your project:

```text
/plugins install https://github.com/stripe/ai
```

Sources: [Kimi Code CLI plugin docs](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/plugins)
([mirror source](https://github.com/MoonshotAI/kimi-code/blob/main/docs/en/customization/plugins.md)),
and Kimi's own [`marketplace.json` example](https://github.com/MoonshotAI/kimi-code/blob/main/plugins/marketplace.json),
which confirms Kimi's manifest fields (`plugins[].id`, `source`, `displayName`)
rather than the Agent Plugins `plugin.json` shape used elsewhere in this repo.

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

The clients below are drawn from the Agent Plugins spec's own
[compatible clients list](https://agent-plugins.org/compatible-clients)
([source](https://github.com/agentplugins/agent-plugins-site/blob/main/lib/compatible-clients.ts)).

A few of these clients look for a bare, root-level `marketplace.json` (or a
`.claude-plugin/marketplace.json`/`.cursor-plugin/marketplace.json` fallback),
but they don't all parse the same schema. For example:
- Claude Code's format requires a top-level `owner` object and per-plugin
  `description`/`version`/`author` fields — see the
  [Claude Code marketplace docs](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces).
- Codex checks four candidate paths (`.agents/plugins/marketplace.json`,
  `.agents/plugins/api_marketplace.json`, `.claude-plugin/marketplace.json`,
  and `.cursor-plugin/marketplace.json` — notably *not* `.codex-plugin/marketplace.json`)
  and additionally expects a Codex-specific `policy.installation`/
  `policy.authentication` object and optional `category` per plugin, per the
  `RawMarketplaceManifest`/`RawMarketplaceManifestPlugin` types in
  [`codex-rs/core-plugins/src/marketplace.rs`](https://github.com/openai/codex/blob/main/codex-rs/core-plugins/src/marketplace.rs).
- GitHub Copilot CLI checks `.github/plugin/marketplace.json` first, then
  falls back to `.claude-plugin/marketplace.json`, and documents itself as
  compatible with the Claude Code schema plus optional "Open Plugin Spec"
  extensions — see the
  [Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

In short: several clients converge on (or fall back to) the schema Claude
Code originated, but Codex's variant adds required fields Claude's doesn't
have, and Cursor and Kimi use their own dedicated formats — so a listing
built for one client isn't guaranteed to validate on another without checking
that client's own docs or source first.

#### GitHub Copilot CLI

Run these commands in your project:

```bash
copilot plugin marketplace add stripe/ai
copilot plugin install stripe@stripe
```

Source: [Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

#### VS Code

Add this repo as a plugin marketplace in your `settings.json`, then install
`stripe@stripe` from the Agent Plugins view in the Extensions sidebar:

```json
"chat.plugins.marketplaces": ["stripe/ai"]
```

Source: [VS Code Agent Plugins docs](https://code.visualstudio.com/docs/agent-customization/agent-plugins).

#### OpenClaw

OpenClaw resolves marketplaces from a repo's `.claude-plugin/marketplace.json`
first, falling back to a bare root `marketplace.json` — this repo already
publishes the former for Claude Code. Run these commands in your project:

```bash
openclaw plugins marketplace list stripe/ai
openclaw plugins install stripe --marketplace stripe/ai
```

Sources: [OpenClaw plugin bundles docs](https://docs.openclaw.ai/plugins/bundles)
and the `MARKETPLACE_MANIFEST_CANDIDATES` constant in
[`src/plugins/marketplace.ts`](https://github.com/openclaw/openclaw/blob/main/src/plugins/marketplace.ts).

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

Sources: [Hermes Agent plugin docs](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins#portable-agent-plugins-v1-packages),
and the subdirectory-shorthand parsing in
[`hermes_cli/plugin_packs.py`](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/plugin_packs.py)
and the `--enable`/`--no-enable` prompt-skip flags in
[`hermes_cli/subcommands/plugins.py`](https://github.com/NousResearch/hermes-agent/blob/main/hermes_cli/subcommands/plugins.py).

#### NanoClaw

NanoClaw only stamps templates from a local directory, so copy the package in
before creating a group:

```bash
git clone --depth 1 https://github.com/stripe/ai /tmp/stripe-ai
cp -r /tmp/stripe-ai/providers/agent-plugins/plugin templates/stripe
ncl groups create --template stripe --name "Stripe Agent" --yes
```

Source: [NanoClaw templates docs](https://github.com/nanocoai/nanoclaw/blob/main/docs/templates.md).

#### Kiro

Kiro already lists Stripe in its curated registry. Browse to
[kiro.dev/powers](https://kiro.dev/powers), find Stripe, and select
**Add to Kiro** — no manual installation is required.

Source: [Kiro powers docs](https://kiro.dev/docs/powers/).


## Manual installation

> Manually installed skills don’t auto-update. Run `npx skills update -y` to get the latest versions.

Run this command in your project:

```bash
npx skills add https://docs.stripe.com
```


## License

[MIT](LICENSE)

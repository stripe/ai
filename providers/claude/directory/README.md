# Stripe Directory (experimental plugin)

This is an experimental, slimmed-down Claude Code plugin that includes only the
`stripe-directory` and `stripe-projects` skills. It has no agents, commands, or
MCP server configuration — it exists to let people try Stripe Directory in
isolation from the full `stripe` plugin.

This plugin is defined on the `directory-plugin` branch of this repo and is
not (yet) part of the default marketplace on `main`.

## Try it

### 1. Add this branch as an alternate marketplace

```bash
claude plugin marketplace add stripe/ai --branch directory-plugin
```

### 2. Install the plugin variant(s) you want to test

Install just the experimental Directory-only plugin:

```bash
claude plugin install stripe-directory@stripe
```

Install the full `stripe` plugin (for comparison, from the same marketplace
branch):

```bash
claude plugin install stripe@stripe
```

Both can be installed side by side, but since `stripe-directory` and
`stripe-projects` skills are removed from the full plugin here, installing
both will not create duplicate skills.

### 3. Remove when done experimenting

```bash
claude plugin uninstall stripe-directory
claude plugin marketplace remove stripe
```

## What's in here

```
providers/claude/directory/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── stripe-directory/
│   └── stripe-projects/
└── README.md
```

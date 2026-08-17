# Provider Plugins

This directory contains plugins for different AI code editors.

## Agent Plugins 1.0

`providers/agent-plugins/` is the package root for the [Agent Plugins 1.0](https://agent-plugins.org) package. It contains:

- `plugin.json` — package manifest (version bumped by sync when skills change)
- `mcp.json` — remote MCP server configuration
- `skills/` — generated skill copies synced from docs.stripe.com

Skills under `providers/agent-plugins/skills/` are verbatim copies of the canonical skills. Skill frontmatter uses a YAML-array `allowed-tools` field; that format is preserved intentionally as the community-compatible representation, even though the current Agent Skills spec text describes a string.

## Skills

**Do not edit skill files in provider directories manually.**

Skills in `providers/*/plugin/skills/` and `providers/agent-plugins/skills/` are automatically synced from [docs.stripe.com/.well-known/skills](https://docs.stripe.com/.well-known/skills) via the [sync-skills workflow](/.github/workflows/sync-skills.yml). Any manual changes will be overwritten.

To manually trigger a sync, go to the [workflow page](https://github.com/stripe/agent-toolkit/actions/workflows/sync-skills.yml) and click "Run workflow".


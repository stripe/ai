# Provider Plugins

This directory contains plugins for different AI code editors.

## Skills

**Do not edit skill files in provider directories manually.**

Skills in `providers/*/plugin/skills/` are automatically synced from [docs.stripe.com/.well-known/skills](https://docs.stripe.com/.well-known/skills) via the [sync-skills workflow](/.github/workflows/sync-skills.yml). Any manual changes will be overwritten.

To manually trigger a sync, go to the [workflow page](https://github.com/stripe/agent-toolkit/actions/workflows/sync-skills.yml) and click "Run workflow".

## Local-only skills

`connect-recommend` is maintained per provider (not overwritten by the docs.stripe.com sync). Provider-specific wiring (subagent spawn, tool names, path tokens) lives there. Do not move Connect recommendation logic into the synced skill set without updating `LOCAL_SKILLS` in `scripts/sync.js`.


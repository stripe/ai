# Provider Plugins

This directory contains plugins for different AI code editors.

## Skills

**Do not edit skill files in provider directories manually.**

Skills in `providers/*/plugin/skills/` are automatically synced from [docs.stripe.com/.well-known/skills](https://docs.stripe.com/.well-known/skills) via the [sync-skills workflow](/.github/workflows/sync-skills.yml). Any manual changes will be overwritten.

To manually trigger a sync, go to the [workflow page](https://github.com/stripe/agent-toolkit/actions/workflows/sync-skills.yml) and click "Run workflow".

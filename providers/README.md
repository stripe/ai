# Provider Plugins

This directory contains plugins for different AI code editors.

## Skills

**Do not edit skill files in provider directories manually**

Skills in `providers/*/plugin/skills/` are automatically synced from mcp.stripe.com via [this GitHub Action](https://github.com/stripe/agent-toolkit/blob/main/.github/workflows/sync-skills.yml).

To manually trigger a sync:

1. Go to https://github.com/stripe/agent-toolkit/actions/workflows/sync-skills.yml
2. Click "Run workflow"
3. Click the green "Run workflow" button

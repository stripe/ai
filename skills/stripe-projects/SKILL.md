---
name: stripe-projects
description: Stripe Projects CLI tool for provisioning and managing accounts and services across third-party infrastructure SaaS providers. Use when user wants to set up a new web stack, configure infrastructure services, or manage service provider accounts through a unified CLI interface.
alwaysApply: false
---

# Stripe Projects

Provision real services from the terminal - unified CLI for infrastructure setup across Vercel, Railway, Neon, Supabase, Clerk, PostHog, and more.

## Overview

Stripe Projects is a CLI plugin that provisions and manages infrastructure services across multiple third-party SaaS providers from a single interface. It:
- ✓ Provisions real services from the terminal
- ✓ Keeps resources in your provider accounts
- ✓ Returns credentials in an agent-readable format
- ✓ Supports upgrades to paid tiers without stack rebuilds
- ✓ Centralizes credential management

## Prerequisites

```bash
# Install Stripe CLI
brew install stripe

# Install Projects plugin
stripe plugin install projects
```

## Essential Commands

### 1. Create a Project

```bash
stripe projects init my-app
```

Creates a local project with `stripe-projects.json` configuration file and authenticates with Stripe.

### 2. Browse Available Providers

```bash
# List all providers and tiers
stripe projects catalog

# Include pricing details
stripe projects catalog --prices
```

Shows available providers (Vercel, Railway, Neon, Supabase, Clerk, PostHog, etc.) with tier options.

### 3. Add Services

```bash
# Add any service (hosting, database, auth, analytics)
stripe projects services add neon/postgres
stripe projects services add clerk/auth
stripe projects services add vercel/hosting
stripe projects services add posthog/analytics
```

Provisions services and stores credentials in your project.

**Pro tip:** Use `--tier free` and `--no-interactive` flags for scripting:
```bash
stripe projects services add neon/postgres --tier free --no-interactive
```

### 4. Connect Existing Accounts

```bash
# Import existing account via OAuth
stripe projects services link clerk/auth
stripe projects services link supabase/postgres
```

Opens browser OAuth flow to connect your existing provider accounts instead of creating new ones.

### 5. View Project Status

```bash
# Check all services health
stripe projects status

# Get JSON output for scripts
stripe projects status --json
```

Shows service health, tiers, usage, and support contacts.

### 6. Export Credentials

```bash
# View credentials (masked)
stripe projects env list

# Write to .env files
stripe projects env sync
```

Creates `.env` files for each provider with unmasked credentials (`.env.neon`, `.env.clerk`, `.env.vercel`, etc.).

### 7. Rotate Credentials

```bash
# Rotate service credentials
stripe projects services rotate neon/postgres

# Skip confirmation prompt
stripe projects services rotate neon/postgres --auto-confirm
```

Generates new credentials and invalidates old ones. Run `stripe projects env sync` afterward to update local files.

### 8. Upgrade Service Tiers

```bash
# Upgrade single service
stripe projects services upgrade neon/postgres

# Upgrade multiple services
stripe projects services upgrade railway/hosting vercel/hosting
```

### 9. Open Provider Dashboards

```bash
# Open provider dashboard in browser
stripe projects services open vercel
stripe projects services open neon
```

Automatically authenticates you to the provider's dashboard.

### 10. Manage Billing

```bash
# View payment method
stripe projects billing method

# Update payment method
stripe projects billing update
```

## Complete Setup Example

```bash
# 1. Install
stripe plugin install projects

# 2. Create project
stripe projects init my-stack

# 3. Add services
stripe projects services add vercel/hosting --tier free
stripe projects services add neon/postgres --tier free
stripe projects services add clerk/auth --tier free

# 4. Check status
stripe projects status

# 5. Export credentials
stripe projects env sync

# 6. Verify setup
ls -la .env.*
```

## Supported Providers

**Hosting:** Vercel, Railway
**Databases:** Neon (Postgres), Supabase, PlanetScale (MySQL), Turso (SQLite)
**Auth:** Clerk
**Analytics:** PostHog
**Other:** Chroma (vector DB), Runloop (dev sandboxes)

## Common Flags

| Flag | Description |
|------|-------------|
| `--json` | Return output as structured JSON instead of formatted text |
| `--no-interactive` | Disable interactive prompts (commands fail when required input is missing) |
| `--auto-confirm` | Accept confirmation prompts automatically |
| `--quiet` | Suppress non-essential output, return only results or errors |
| `--tier <tier>` | Specify tier when adding a service to skip tier selection |

## CI/CD Usage

```bash
# Non-interactive service provisioning
stripe projects services add supabase/postgres \
  --tier free \
  --no-interactive \
  --json

# Silent credential sync
stripe projects env sync --quiet

# JSON status check
stripe projects status --json
```

## Additional Commands

### Export Project Configuration

```bash
# Export as JSON
stripe projects export > config.json

# Export as YAML
stripe projects export --format=yaml > stack.yaml
```

Useful for documentation and version control (credentials are not exported).

### List All Projects

```bash
# Show all projects in your account
stripe projects list
```

### Configure Services

```bash
# Run configuration prompts for existing service
stripe projects services config vercel/hosting
```

### Remove Services

```bash
# Remove a service from your project
stripe projects services remove neon/postgres
```

## When to Use Stripe Projects

Use Stripe Projects when you need to:
- Set up a new web stack or infrastructure
- Provision accounts across multiple SaaS providers
- Manage service credentials in one place
- Configure hosting, databases, auth, or analytics services
- Upgrade service tiers without rebuilding your stack
- Automate infrastructure provisioning in CI/CD pipelines

## Best Practices

- Always specify tiers explicitly with `--tier` flag when scripting
- Use `--json` output for parsing in scripts and automation
- Run `stripe projects env sync` after credential rotation
- Use `stripe projects services link` to connect existing accounts rather than creating duplicates
- Export project configuration with `stripe projects export` for documentation
- Centralize credential management through Projects instead of manually managing across dashboards

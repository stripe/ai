---
name: stripe-projects
description: Stripe Projects CLI tool for provisioning and managing accounts and services across third-party infrastructure SaaS providers. Use when user wants to set up a new web stack, configure infrastructure services, or manage service provider accounts through a unified CLI interface.
alwaysApply: false
---

# Stripe Projects

Provision real services from the terminal — unified CLI for infrastructure setup across Vercel, Neon, Supabase, Clerk, PostHog, Sentry, Resend, and more.

## Overview

Stripe Projects is a CLI plugin that provisions and manages infrastructure services across multiple third-party SaaS providers from a single interface. It:
- ✓ Provisions real services from the terminal
- ✓ Keeps resources in your provider accounts
- ✓ Returns credentials in an agent-readable format
- ✓ Centralizes credential management in a single `.env` file

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

Creates a `project.toml` configuration file in the current directory and authenticates with Stripe.

### 2. Browse Available Providers

```bash
# List all providers and tiers
stripe projects services list

# Filter by category
stripe projects services list --category db
stripe projects services list --category auth
stripe projects services list --category hosting
```

Categories: `db`, `auth`, `hosting`, `analytics`, `observability`, `email`

### 3. Add Services

Services use the format `provider:service:tier`:

```bash
stripe projects services add neon:db:free
stripe projects services add clerk:auth:free
stripe projects services add vercel:hosting:hobby
stripe projects services add posthog:analytics:base
```

For scripting, use `--no-input` to skip confirmation prompts:
```bash
stripe projects services add neon:db:free --no-input
```

### 4. Connect Existing Accounts

```bash
# Connect existing account via OAuth
stripe projects services link supabase
stripe projects services link clerk
```

Opens a browser OAuth flow to connect your existing provider accounts instead of creating new ones.

### 5. View Project Status

```bash
# Check all services health
stripe projects status

# Get JSON output for scripts
stripe projects status --json
```

### 6. Export Credentials

```bash
# Write all credentials to .env
stripe projects env export

# Export to a specific file
stripe projects env export --path .env.local

# View credentials without writing to disk
stripe projects env list
```

### 7. Rotate Credentials

```bash
stripe projects services rotate neon:db
stripe projects services rotate clerk:auth
```

Generates new credentials and invalidates old ones. Run `stripe projects env export` afterward to update your local `.env`.

### 8. Change Service Tiers

To change tiers, remove the existing service and add the new tier:

```bash
stripe projects services remove neon:db
stripe projects services add neon:db:launch
# -> neon:db:launch costs $19/mo. Continue? [y/N]
```

### 9. Remove Services

```bash
stripe projects services remove neon:db
```

Removes credentials from Projects. Provider-side data is not deleted.

## Complete Setup Example

```bash
# 1. Install plugin
stripe plugin install projects

# 2. Create project
stripe projects init my-stack

# 3. Browse what's available
stripe projects services list

# 4. Add services
stripe projects services add vercel:hosting:hobby
stripe projects services add neon:db:free
stripe projects services add clerk:auth:free

# 5. Check status
stripe projects status

# 6. Export credentials
stripe projects env export

# 7. Verify
cat .env
```

## Supported Providers

| Category | Provider | Free Tier | Paid Tier |
|----------|----------|-----------|-----------|
| **Hosting** | `vercel:hosting` | hobby (free) | pro ($20/mo) |
| | `cloudflare:hosting` | free | pro ($20/mo) |
| **Database** | `neon:db` | free | launch ($19/mo) |
| | `supabase:db` | micro (free) | pro ($25/mo) |
| **Auth** | `clerk:auth` | free | pro ($25/mo) |
| **Analytics** | `posthog:analytics` | base (free) | premium ($20/mo) |
| **Observability** | `sentry:observability` | developer (free) | team ($26/mo) |
| **Email** | `resend:email` | free | pro ($20/mo) |

## Common Flags

| Flag | Description |
|------|-------------|
| `--json` | Return output as structured JSON instead of formatted text |
| `--no-input` | Disable interactive prompts (fail if input is required) |
| `-h, --help` | Show help for any command |

## CI/CD Usage

```bash
# Non-interactive service provisioning
stripe projects services add neon:db:free --no-input --json

# Export credentials
stripe projects env export

# JSON status check
stripe projects status --json
```

## When to Use Stripe Projects

Use Stripe Projects when you need to:
- Set up a new web stack or infrastructure
- Provision accounts across multiple SaaS providers
- Manage service credentials in one place
- Configure hosting, databases, auth, analytics, observability, or email services
- Automate infrastructure provisioning in CI/CD pipelines

## Best Practices

- Run `stripe projects services list` to discover exact provider and tier names before adding
- Use `--json` output for parsing in scripts and automation
- Run `stripe projects env export` after rotating credentials
- Use `stripe projects services link` to connect existing accounts rather than creating duplicates
- Add `.env` to `.gitignore` — never commit credentials

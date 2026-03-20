# Stripe Projects

## Table of contents
- When to use Stripe Projects
- Essential commands
- Complete setup workflow
- Supported providers
- Additional commands
- Traps to avoid

## When to use Stripe Projects

Use [Stripe Projects](https://docs.stripe.com/stripe-projects) when you need to provision and manage infrastructure services across third-party SaaS providers from a unified CLI interface.

Stripe Projects provides a single command-line tool to:
- Provision accounts across hosting, database, auth, analytics, observability, and email providers
- Manage service credentials in one place
- Export all environment variables to a single `.env` file

**Supported providers:** Vercel, Cloudflare (hosting), Neon, Supabase (databases), Clerk (auth), PostHog (analytics), Sentry (observability), Resend (email)

## Essential commands

### Installation
```bash
# Install Stripe CLI
brew install stripe

# Install Projects plugin
stripe plugin install projects
```

### Create a project
```bash
stripe projects init my-app
```

Creates a `project.toml` configuration file in the current directory.

### Browse available providers
```bash
# List all providers and tiers
stripe projects services list

# Filter by category
stripe projects services list --category db
```

Categories: `db`, `auth`, `hosting`, `analytics`, `observability`, `email`

### Add services

Services use the format `provider:service:tier`:

```bash
stripe projects services add neon:db:free
stripe projects services add clerk:auth:free
stripe projects services add vercel:hosting:hobby
```

### Export credentials
```bash
# Write all credentials to .env
stripe projects env export

# View credentials without writing to disk
stripe projects env list
```

### Check status
```bash
stripe projects status
stripe projects status --json
```

## Complete setup workflow

```bash
# 1. Install
stripe plugin install projects

# 2. Create project
stripe projects init my-stack

# 3. Add services
stripe projects services add vercel:hosting:hobby
stripe projects services add neon:db:free
stripe projects services add clerk:auth:free

# 4. Check status
stripe projects status

# 5. Export credentials
stripe projects env export
```

## Supported providers

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

## Additional commands

### Connect existing accounts
```bash
# Connect existing account via OAuth (opens browser)
stripe projects services link supabase
stripe projects services link vercel
```

### Rotate credentials
```bash
stripe projects services rotate neon:db
```

Run `stripe projects env export` after rotation to update local files.

### Change service tiers

Remove and re-add with the new tier:

```bash
stripe projects services remove neon:db
stripe projects services add neon:db:launch
# -> neon:db:launch costs $19/mo. Continue? [y/N]
```

### Remove services
```bash
stripe projects services remove neon:db
```

Removes credentials from Projects. Provider-side data is not deleted.

### CI/CD usage
```bash
stripe projects services add neon:db:free --no-input --json
stripe projects env export
stripe projects status --json
```

## Traps to avoid

- Do not use the old `provider/service` format — services now use `provider:service:tier` (e.g. `neon:db:free`, not `neon/postgres`)
- Do not use `stripe projects env sync` — the correct command is `stripe projects env export`
- Do not use `stripe projects catalog` — the correct command is `stripe projects services list`
- Do not use `--no-interactive` — the correct flag is `--no-input`
- Do not manually manage credentials across provider dashboards — use `stripe projects env export` to centralize
- Add `.env` to `.gitignore` — never commit credentials

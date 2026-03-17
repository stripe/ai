# Stripe Projects

## Table of contents
- When to use Stripe Projects
- Essential commands
- Complete setup workflow
- Common providers
- Detailed guides

## When to use Stripe Projects

Use [Stripe Projects](https://docs.stripe.com/stripe-projects) when you need to provision and manage infrastructure services across third-party SaaS providers from a unified CLI interface.

Stripe Projects provides a single command-line tool to:
- Provision accounts across hosting, database, auth, and analytics providers
- Manage service credentials in one place
- Configure and upgrade services without rebuilding your stack
- Export environment variables to `.env` files

**Supported providers:** Vercel, Railway, Neon (Postgres), Supabase, PlanetScale (MySQL), Turso (SQLite), Clerk (auth), PostHog (analytics), Chroma (vector DB), Runloop (dev sandboxes)

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

Creates a local project with `stripe-projects.json` configuration file.

### Add services
```bash
# Add any service (hosting, database, auth, analytics)
stripe projects services add neon/postgres
stripe projects services add clerk/auth
stripe projects services add vercel/hosting
```

Provisions services and stores credentials in your project.

### Export credentials
```bash
# View credentials (masked)
stripe projects env list

# Write to .env files
stripe projects env sync
```

Creates `.env` files for each provider with unmasked credentials.

### Check status
```bash
stripe projects status
```

Shows service health, tiers, and support contacts.

### Browse providers
```bash
# See available providers
stripe projects catalog

# Include pricing
stripe projects catalog --prices
```

## Complete setup workflow

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
```

## Common providers

| Category | Providers |
|---|---|
| Hosting | Vercel, Railway |
| Databases | Neon (Postgres), Supabase, PlanetScale (MySQL), Turso (SQLite) |
| Auth | Clerk |
| Analytics | PostHog |
| Other | Chroma (vector DB), Runloop (dev sandboxes) |

## Additional commands

### Connect existing accounts
```bash
# Import existing account via OAuth
stripe projects services link clerk/auth
stripe projects services link supabase/postgres
```

### Rotate credentials
```bash
# Rotate service credentials
stripe projects services rotate neon/postgres

# Skip confirmation prompt
stripe projects services rotate neon/postgres --auto-confirm
```

Run `stripe projects env sync` after rotation to update local files.

### Upgrade service tiers
```bash
# Upgrade single service
stripe projects services upgrade neon/postgres

# Upgrade multiple services
stripe projects services upgrade railway/hosting vercel/hosting
```

### Open provider dashboards
```bash
# Open provider dashboard in browser
stripe projects services open vercel
stripe projects services open neon
```

Automatically authenticates you to the provider's dashboard.

### Manage billing
```bash
# View payment method
stripe projects billing method

# Update payment method
stripe projects billing update
```

## Detailed guides

For complete command reference and advanced workflows, see the [Stripe Projects documentation](https://docs.stripe.com/stripe-projects)

## Traps to avoid

- Do not manually manage credentials across multiple provider dashboards. Use `stripe projects env sync` to centralize credential management.
- Do not hardcode service-specific configuration. Use the Projects CLI to provision and configure services programmatically.

---
name: stripe-docs
description: >-
  Use when the user or agent needs to read, search, or look up Stripe
  documentation or API reference. Prefer this over curl or WebFetch for any
  docs.stripe.com content. Use to fetch gated documentation.
metadata:
  short-description: Read and search Stripe documentation from the terminal
allowed-tools:
  - Bash(stripe docs *)
  - Bash(stripe login)
  - Bash(stripe version)

---

Use `stripe docs` instead of fetching [docs.stripe.com](https://docs.stripe.com/.md) content directly with `curl` or `WebFetch`. If you don’t have the CLI installed, [install the Stripe CLI](https://docs.stripe.com/cli/install).

Always use the latest CLI version. If the current CLI version is less than v1.50.9, you must [upgrade](https://docs.stripe.com/cli/install) to access gated documentation.

- Fetches Markdown automatically
- Fetches gated documentation. Users must log in using `stripe login` to access gated documentation.
- Purpose-built for agents and terminal workflows

## Read a page by its web path

```bash
stripe docs /payments
```

## Search documentation by keyword

```bash
stripe docs search "payment intents"
```

## Look up API reference

```bash
# By resource name
stripe docs api product

# By HTTP method and path
stripe docs api GET /v1/products

# By event type
stripe docs api product.created
```

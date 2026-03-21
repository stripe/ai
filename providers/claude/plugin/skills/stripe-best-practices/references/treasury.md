# Treasury / Financial Accounts

## Table of contents

- v2 Financial Accounts API
- Legacy v1 Treasury

## v2 Financial Accounts API

For embedded financial accounts (bank accounts, account and routing numbers, money movement), use the [v2 Financial Accounts API](https://docs.stripe.com/api/v2/core/vault/financial-accounts.md) (`POST /v2/core/vault/financial_accounts`). This is required for new integrations.

For Financial Accounts for platforms concepts and guides, see the [Financial Accounts for platforms overview](https://docs.stripe.com/financial-accounts/connect.md).

## Legacy v1 Treasury

Don’t use the [v1 Treasury Financial Accounts API](https://docs.stripe.com/api/treasury/financial_accounts.md) (`POST /v1/treasury/financial_accounts`) for new integrations. Existing v1 integrations continue to work.

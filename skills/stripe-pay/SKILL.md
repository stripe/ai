---
name: stripe-pay
description: >-
  Helps users send funds to another Stripe business, transfer money to a Stripe
  Profile handle or network ID, or ask whether an agent can pay a Stripe
  business. Use Stripe Directory to find or verify a recipient when the user
  doesn't provide an exact Stripe Profile handle or network ID.
metadata:
  short-description: Send funds to Stripe businesses
allowed-tools:
  - Bash(stripe directory *)
  - Bash(stripe pay *)
  - Bash(stripe whoami *)

---

# `stripe pay`

Use `stripe pay` to send money from the authenticated Stripe business to another Stripe business identified by a [Stripe Profile](https://docs.stripe.com/get-started/account/profile.md) handle, for example `@recipient`.

The `stripe pay` command is for business-to-business money transfers. Both the sender and the receiving business must have a [Stripe Profile](https://docs.stripe.com/get-started/account/profile.md). In addition:

- The sender needs a funded [financial account](https://docs.stripe.com/money-management.md).
- The receiver needs an eligible transfer destination linked to their [Stripe Profile](https://docs.stripe.com/get-started/account/profile.md).

If the user needs details about financial accounts, read [Money Management](https://docs.stripe.com/money-management.md). The command resolves the recipient’s payout configuration, which can route the payout to an attached financial account or linked bank account, and reports the fee and delivery timing before confirmation. Don’t assume that a transfer is free or instant.

## Safety Rules

1. Don’t send money unless the user explicitly asks you to make the transfer.
2. Before running a command that can send money, show the exact `stripe pay ...` command you plan to run and get confirmation.
3. Use `--agent` or `--json` first so the user can review the transfer details.
4. Don’t pass `-y` or `--yes` until after the user confirms the reviewed transfer.
5. Don’t guess at the user’s intent. Don’t guess at the username, financial account ID, amount, currency, internal note, memo, or any other detail. Always confirm with the user.
6. Don’t print full API keys back to the user.

## Choose the workflow

Read the documentation to accomplish your goal. You must read the relevant page before taking action:

| Goal | Documentation |
| --- | --- |
| Find or verify a recipient when the user doesn’t provide an exact Stripe Profile handle or network ID | [Use Stripe Directory with AI agents](https://docs.stripe.com/directory.md#agents) |
| Review, send, handle approval, resume, or dry-run a transfer | [`stripe pay` CLI reference](https://docs.stripe.com/cli/pay) |
| Create or manage a Stripe Profile, including a recipient’s transfer destination | [Stripe Profile](https://docs.stripe.com/get-started/account/profile.md) |
| Set up or understand an eligible financial account | [Money Management](https://docs.stripe.com/money-management.md) |

## Handle setup errors

Don’t continue the transfer when `stripe pay` reports missing setup. Explain what’s missing and give the user the corresponding next step. Before explaining how to resolve the error, read the documentation for the missing requirement in the workflow table:

- If the sender is missing a [Stripe Profile](https://docs.stripe.com/get-started/account/profile.md), tell the user to create one.
- If the sender is missing an eligible financial account, tell the user to set up Global Payouts with an eligible financial account.
- If the sender is missing both requirements, tell the user to complete both setup steps before trying the transfer again.
- If the recipient doesn’t have an eligible transfer destination linked to their Stripe Profile, tell the user that the recipient must complete that setup before the transfer can proceed. Don’t retry the transfer until the recipient’s setup is corrected.
- If the recipient is missing or invalid, read and follow the [Stripe Directory agent workflow](https://docs.stripe.com/directory.md#agents). If the user can provide the recipient’s exact Stripe Profile handle or network ID, ask them for it.

For sender setup, direct the user to the relevant Dashboard page:

- To create a Stripe Profile, open https://dashboard.stripe.com/profiles and click **Get started**.
- To set up Global Payouts with an eligible financial account, open https://dashboard.stripe.com/balance/financial-accounts and click **Get started**.

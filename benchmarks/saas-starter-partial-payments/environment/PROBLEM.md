# SaaS Starter - Partial Payments Integration

## Overview

You have a Next.js SaaS starter application with a subscription-based checkout. Your task is to modify it to support partial payments, allowing customers to pay for their subscription in 2 separate installments.

## Setup

1. Review the README.md for setup instructions
2. PostgreSQL is already installed. Use these connection details:
   - Database: `saas_db`
   - User: `model`
   - Password: `password`
   - Connection URL: `postgresql://model:password@localhost:5432/saas_db`
3. The Stripe secret and publishable keys are in the `.env` file

## Tasks

### Task 1: Remove Trial Period
- Modify the base subscription to remove any trial period
- Customers should be charged immediately

### Task 2: Implement Partial Payments
- Modify the checkout flow so that customers make 2 separate checkouts to complete the purchase
- Each checkout should pay for half of the subscription amount
- Both payments should be attached to the same invoice

### Task 3: Test and Capture Invoice ID
- Navigate through the checkout flow:
  1. Sign up and create an account
  2. Go to team settings
  3. Click "manage subscription"
  4. Click the base subscription "Get Started" button
- Complete both partial payments
- Capture the invoice ID

## Submission

Write ONLY the invoice ID to `/workdir/ids_for_grading.txt`

Example: If your invoice ID is `in_1abc123...`, write just that ID to the file.

## Hints

- Stripe has a paved path for attaching multiple payments to an invoice using `/v1/invoices/{INVOICE_ID}/attach_payment`
- Use the payments from checkout sessions and attach them to the invoice
- You should get the invoice ID from the subscription's first invoice

## Grading Criteria

Your solution will be graded on:
1. Invoice status is `paid`
2. Invoice is associated with a subscription
3. Subscription status is `active`
4. Invoice has exactly 2 payments
5. Payments are divided evenly (each is half the total)
6. Both payments have `paid` status
7. Both payments have associated checkout sessions

## Test Card

Use test card: `4242 4242 4242 4242` with any future expiry and any CVC

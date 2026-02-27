# SaaS Starter - Embedded Checkout Integration

## Overview

You have a Next.js SaaS starter application with a basic Stripe Checkout integration. Your task is to upgrade it to use Stripe's embedded checkout and add a promotional code feature.

## Setup

1. Review the README.md for setup instructions
2. PostgreSQL is already installed. Use these connection details:
   - Database: `saas_db`
   - User: `model`
   - Password: `password`
   - Connection URL: `postgresql://model:password@localhost:5432/saas_db`
3. The Stripe secret and publishable keys are in the `.env` file

## Tasks

### Task 1: Upgrade to Embedded Checkout
- Modify the checkout integration to be embedded directly in the website
- The checkout should use `ui_mode: 'embedded'` instead of redirecting to Stripe's hosted page

### Task 2: Create Promo Code
- Create a promotion code named `TAKE20` that applies a 20% discount
- The promo code should be usable during checkout

### Task 3: Test and Capture Session ID
- Navigate through the checkout flow:
  1. Sign up and create an account
  2. Go to team settings
  3. Click "manage subscription"
  4. Click the base subscription "Get Started" button
- Complete a test purchase using the promo code
- Capture the checkout session ID

## Submission

Write ONLY the checkout session ID to `/workdir/ids_for_grading.txt`

Example: If your checkout session ID is `cs_test_abc123...`, write just that ID to the file.

## Hints

- Use the Stripe documentation for embedded checkout: https://stripe.com/docs/checkout/embedded/quickstart
- The checkout session ID can be obtained from the `stripe.checkout.sessions.create()` response
- Test card number: `4242 4242 4242 4242` with any future expiry and any CVC

## Grading Criteria

Your solution will be graded on:
1. Checkout session has `ui_mode` set to `embedded`
2. Checkout mode is set to `subscription`
3. Payment status is `paid`
4. A discount was applied using the `TAKE20` promo code
5. The discount is 20% off

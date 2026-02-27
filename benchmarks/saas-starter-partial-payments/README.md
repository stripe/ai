# SaaS Starter - Partial Payments

A computer-use eval testing the ability to implement partial/split payments for a subscription invoice, forked from https://github.com/nextjs/saas-starter

## Overview

This eval tests:
1. Removing trial periods from subscriptions
2. Implementing partial payments (2 checkouts to pay one invoice)
3. Attaching multiple payment intents to a single invoice
4. Capturing the invoice ID after completing the flow

## Structure

```
saas-starter-partial-payments/
├── environment/          # Next.js SaaS app (given to AI)
│   ├── PROBLEM.md        # Problem statement
│   ├── .env.example      # Environment variable template
│   ├── README.md         # App setup instructions
│   └── app/              # Next.js app router
├── grader/               # Pytest-based grader (hidden)
│   ├── grade.sh          # Main grading script
│   ├── invoice_tests.py  # Invoice validation tests
│   ├── checkout_tests.py # Checkout session tests (if cs_ ID provided)
│   └── conftest.py       # Pytest configuration
├── solution/             # Solution notes (see below)
└── README.md
```

## Running the Grader

```bash
# Requires STRIPE_SECRET_KEY environment variable
cd grader
./grade.sh in_your_invoice_id
```

## Solution Notes

This eval requires interactive completion. The solution involves:
1. Modifying subscription creation to remove trial periods
2. Creating a partial payment flow that:
   - Creates a subscription with `payment_behavior: 'default_incomplete'`
   - Uses `stripe.invoices.attach_payment` to attach multiple payments
   - Creates 2 checkout sessions, each for half the amount
3. Completing both checkout flows
4. Capturing the invoice ID

## Requirements

This eval requires:
- Node.js/pnpm for the Next.js app
- PostgreSQL database
- Stripe test API keys with permissions to create invoices and subscriptions

## Stripe API Key Injection

A Stripe test secret key (`sk_test_...`) is the only external credential required. It is injected at runtime, never baked into the Docker image.

**Via `run_solution.sh`:** Set `STRIPE_SECRET_KEY` in your host shell before running the script. The script conditionally passes it to `docker run -e` only if the variable is set:

```bash
export STRIPE_SECRET_KEY="sk_test_..."
./run_solution.sh
```

**Via `docker run` directly:** Pass the key with the `-e` flag:

```bash
docker build -t saas-starter-partial-payments .
docker run -e STRIPE_SECRET_KEY=sk_test_... saas-starter-partial-payments
```

Inside the container, `run_inside_docker.sh` reads the `STRIPE_SECRET_KEY` environment variable and writes it into the app's `.env` file alongside the other (non-secret) config values before building and starting the server.

## Leak Detection

UUID `16bdce8c-e87b-42d1-b62e-4a9cb0f526f3` is embedded in grader/solution files to detect leaks:
- Grader: `saas-starter-partial-payments-16bdce8c-e87b-42d1-b62e-4a9cb0f526f3-grader`
- Solution: `saas-starter-partial-payments-16bdce8c-e87b-42d1-b62e-4a9cb0f526f3-solution`

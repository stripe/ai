# SaaS Starter - Embedded Checkout

This tests the ability to upgrade a Next.js SaaS application from hosted Stripe Checkout to embedded checkout, forked from https://github.com/nextjs/saas-starter

## Overview

Subtasks:
1. Converting hosted checkout to embedded checkout (https://stripe.com/payments/checkout)
2. Creating and applying a promotion code
3. Completing a test purchase and capturing the checkout session ID

## Structure

```
saas-starter-embedded-checkout/
├── environment/          # Next.js SaaS app (given to AI)
│   ├── PROBLEM.md        # Problem statement
│   ├── .env.example      # Environment variable template
│   ├── README.md         # App setup instructions
│   └── app/              # Next.js app router
├── grader/               # Pytest-based grader (hidden)
│   ├── grade.sh          # Main grading script
│   ├── checkout_tests.py # Checkout session validation tests
│   └── conftest.py       # Pytest configuration
├── solution/             # Solution notes (see below)
└── README.md
```

## Grading

The grader validates the checkout session ID written to `/workdir/ids_for_grading.txt`:
- UI mode is `embedded`
- Mode is `subscription`
- Payment status is `paid`
- A promotion code `TAKE20` with 20% off was applied

## Running the Grader

```bash
# Requires STRIPE_SECRET_KEY environment variable
cd grader
./grade.sh cs_test_your_checkout_session_id
```

## Solution Notes

Unlike simpler evals, this computer-use eval requires:
1. Code modifications to implement embedded checkout
2. Creating a Stripe promotion code via API/dashboard
3. Completing a test checkout flow to generate a valid session ID

A solution to this is discussed in the solution folder.

## Requirements

This eval requires:
- Node.js/pnpm for the Next.js app
- PostgreSQL database
- Stripe test API keys with permissions to create checkout sessions and promotion codes

## Stripe API Key Injection

A Stripe test secret key (`sk_test_...`) is the only external credential required. It is injected at runtime, never baked into the Docker image.

**Via `run_solution.sh`:** Set `STRIPE_SECRET_KEY` in your host shell before running the script. The script conditionally passes it to `docker run -e` only if the variable is set:

```bash
export STRIPE_SECRET_KEY="sk_test_..."
./run_solution.sh
```

**Via `docker run` directly:** Pass the key with the `-e` flag:

```bash
docker build -t saas-starter-embedded-checkout .
docker run -e STRIPE_SECRET_KEY=sk_test_... saas-starter-embedded-checkout
```

Inside the container, `run_inside_docker.sh` reads the `STRIPE_SECRET_KEY` environment variable and writes it into the app's `.env` file alongside the other (non-secret) config values before building and starting the server.

## Leak Detection

UUID `382f431f-68a1-465d-b7ab-18f11f12c7aa` is embedded in grader/solution files to detect leaks:
- Grader: `saas-starter-embedded-checkout-382f431f-68a1-465d-b7ab-18f11f12c7aa-grader`
- Solution: `saas-starter-embedded-checkout-382f431f-68a1-465d-b7ab-18f11f12c7aa-solution`

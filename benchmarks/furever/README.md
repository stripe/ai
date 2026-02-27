## Furever

A computer-use eval based on [Stripe's Furever demo](https://github.com/stripe/stripe-connect-furever-demo) built using Connect embedded components.

## Overview

This eval tests the ability to integrate Stripe Connect Embedded Components into an existing Next.js application.

**Task:** Add a Payments page with the ConnectPayments component configured with:
- Disputes enabled
- Refunds disabled

## Structure

```
furever/
├── environment/          # Next.js app (given to AI)
│   ├── PROBLEM.md        # Problem statement
│   ├── .env.example      # Environment variable template
│   └── app/              # Next.js app router structure
├── grader/               # Selenium-based grader (hidden)
│   ├── payments.py       # Selenium tests
│   └── payments_submit.sh
├── solution/             # Golden answer
│   └── app/              # Solution files to overlay
├── Dockerfile            # Container with Node.js, MongoDB, Firefox, Selenium
├── run_solution.sh       # Docker-based test script
└── README.md
```

## Running the Test

### 1. Set up environment variables

```bash
cp environment/.env.example environment/.env
```

Edit `environment/.env` and replace the placeholder keys with your real Stripe test keys:

```
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLIC_KEY="pk_test_..."
```

### 2. Run the Docker-based test

```bash
./run_solution.sh
```

This will:
1. Build a Docker container with all dependencies
2. Run the grader without solution (should fail)
3. Inject the solution files
4. Run the grader with solution (should pass)

## Stripe Usage

This eval requires Stripe API test keys. See [Stripe API keys documentation](https://docs.stripe.com/keys) for details on obtaining test keys.

## Grader

The grader uses Selenium with Firefox to:
1. Navigate to the app and create a quickstart account
2. Click the "Payments" navigation link
3. Verify the ConnectPayments component renders
4. Check that dispute management is enabled
5. Verify that refunds are disabled

## Leak Detection

UUID `ca518c14-4808-4ab9-974a-0551d0d97727` is embedded in grader/solution files to detect leaks:
- Grader: `furever-ca518c14-4808-4ab9-974a-0551d0d97727-grader`
- Solution: `furever-ca518c14-4808-4ab9-974a-0551d0d97727-solution`

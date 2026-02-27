# Subscription Gym

A Stripe subscription eval environment where LLMs implement subscription logic based on natural language business model descriptions.

## Overview

This evaluation environment provides:
- A skeleton Sinatra server with a well-defined API contract
- 10 natural language business model challenges for LLMs to implement
- A test suite (one RSpec spec per challenge) for validating subscription functionality
- Test clock helpers for time-based subscription testing

## Structure

```
subscription-gym/
├── environment/
│   └── server/
│       ├── server.rb            # Skeleton server with /run-task endpoint (LLM implements this)
│       ├── challenges.rb        # Challenge loader and precondition engine
│       ├── products.rb          # Product catalog (creates Stripe products/prices/meters)
│       └── tasks/               # 10 individual challenge definitions
├── grader/                      # RSpec tests (one per challenge)
├── solution/                    # Reference implementation
│   └── server/
│       └── server.rb
├── Dockerfile
├── run_inside_docker.sh
└── run_solution.sh
```

## Challenges

1. **cancel_subscription_without_proration** - Cancel a subscription immediately without prorating
2. **create_subscription_only** - Create a basic subscription
3. **create_subscription_schedule_only** - Create a subscription schedule
4. **create_subscription_with_discount_and_billing_cycle_anchor** - Subscription with discount and billing cycle anchor
5. **create_subscription_with_one_time_item** - Subscription with a one-time line item
6. **create_subscription_with_trial** - Subscription with a trial period
7. **create_subscription_with_usage_billing** - Metered/usage-based subscription
8. **downgrade_subscription_at_end_of_cycle** - Downgrade at end of billing cycle
9. **preview_invoice** - Preview an upcoming invoice
10. **upgrade_subscription_with_proration** - Upgrade with proration

## How It Works

1. **LLM reads the challenge**: Each task file in `environment/server/tasks/` contains a natural language business model description, preconditions, and an API contract (input/output).
2. **LLM implements `/run-task`**: The LLM implements the `POST /run-task` endpoint in `server.rb` to create appropriate Stripe objects and return the expected response format.
3. **Grader validates**: Each spec file tests that the API contract is followed, Stripe objects are created properly, and subscription behavior matches requirements (including time-based scenarios using test clocks).

## Local Setup

### Prerequisites

- Ruby 3.x
- Bundler

### 1. Configure Stripe API Keys

```bash
# Create .env from the example
cp .env.example environment/server/.env
```

Edit `environment/server/.env` and fill in your Stripe test keys:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_API_VERSION=2025-05-28.basil
```

### 2. Install Dependencies and Start the Server

```bash
cd environment/server
bundle install
bundle exec ruby server.rb
```

The server starts on `http://localhost:4242`. Verify it's running:

```bash
curl http://localhost:4242/config
```

### 3. Run the Grader

In a separate terminal, from the `subscription-gym/` root:

```bash
# Copy .env so the grader can access Stripe API keys
cp environment/server/.env grader/.env

# Install grader dependencies (first time only)
cd grader
bundle install

# Run all grader specs
bundle exec rspec *_spec.rb --format documentation

# Or run a single challenge spec
bundle exec rspec create_subscription_only_spec.rb --format documentation
```

> **Note:** Some tests use Stripe test clocks and may take several minutes to complete (test clocks need time to advance). Also due to limitations of test clocks per customer, subsequent re-runs of the grader against the same product catalog may fail; to fix this delete product_catalog.json and the product data will be repopulated.

## Docker Setup (run_solution.sh)

The Docker workflow builds the image and tests the **solution** server against all 10 grader specs.

### Option A: Using a .env file (preferred)

Create a `.env` file in the `subscription-gym/` root directory:

```bash
cat > .env << 'EOF'
STRIPE_SECRET_KEY=sk_test_...
EOF
```

Then run:

```bash
./run_solution.sh
```

### Option B: Using environment variables

```bash
STRIPE_SECRET_KEY=sk_test_... ./run_solution.sh
```

The Docker container will:
1. Create `.env` files for the solution server and grader
2. Start the solution server on port 4242
3. Run all 10 RSpec specs and report pass/fail

## Leak Detection

UUID `d1d10432-e6b5-4ac1-8a92-dd3ff4f70707` is embedded in grader/solution files to detect leaks:
- Grader: `subscription-gym-d1d10432-e6b5-4ac1-8a92-dd3ff4f70707-grader`
- Solution: `subscription-gym-d1d10432-e6b5-4ac1-8a92-dd3ff4f70707-solution`

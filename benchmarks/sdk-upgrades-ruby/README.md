# SDK Upgrades - Ruby

This eval tests the ability to upgrade a Ruby application from Stripe SDK v7.x to v15.x.

## Problems

1. **charges-on-payment-intent** - Update code that uses the deprecated `payment_intent.charges` attribute (removed in newer API versions). Must use `Charge.list()` or `latest_charge` instead.

2. **invoice-partial-payments** - Update invoice-related code to work with SDK v15.x

3. **subscription-billing-migration** - Update subscription-related code to work with SDK v15.x

## SDK Versions

| Before | After |
|--------|-------|
| stripe ~> 7.1 | stripe ~> 15.0 |
| API 2022-08-01 | API 2025-03-31.basil |

## Prerequisites
- Ruby 3.x and Bundler

## Local Setup

Each problem lives in `environment/<problem>/server/`. To run a problem locally:

### 1. Configure Stripe API Keys

```bash
# Pick a problem to work on
PROBLEM=charges-on-payment-intent  # or invoice-partial-payments, subscription-billing-migration

# Create .env from the example
cp environment/$PROBLEM/server/.env.example environment/$PROBLEM/server/.env
```

Edit `environment/$PROBLEM/server/.env` and fill in your Stripe test keys:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 2. Install Dependencies and Start the Server

```bash
cd environment/$PROBLEM/server
bundle install
bundle exec ruby server.rb
```

The server starts on `http://localhost:4242`. Verify it's running:

```bash
curl http://localhost:4242/config
```

### 3. Run the Grader (should fail on the initial environment)

In a separate terminal, from the `sdk-upgrades-ruby/` root:

```bash
# Copy .env so the grader can access Stripe API keys
cp environment/$PROBLEM/server/.env grader/.env

# Install grader dependencies (first time only)
cd grader
bundle install

# Run the grader RSpec tests directly against the running server
bundle exec rspec $PROBLEM/grade.rb --format documentation
```

> **Note:** The RSpec tests verify endpoint behavior and may pass against the old SDK since the old API still returns compatible response shapes. The full grading gate is in `grade.sh`, which also checks SDK version — but `grade.sh` uses Docker-internal paths and is not meant for local use.

## Docker Setup (run_solution.sh)

The Docker workflow tests both the unmodified environment (should fail) and the reference solution (should pass) automatically.

### Option A: Using a .env file (preferred)

Create a `.env` file in the `sdk-upgrades-ruby/` root directory:

```bash
cat > .env << 'EOF'
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
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

## Structure

```
sdk-upgrades-ruby/
├── environment/          # Given to AI (old SDK code)
│   ├── charges-on-payment-intent/
│   ├── invoice-partial-payments/
│   └── subscription-billing-migration/
├── grader/               # Hidden (RSpec tests)
├── solution/             # Reference (upgraded SDK code)
├── Dockerfile
├── run_inside_docker.sh
└── run_solution.sh
```

## Grading

Each problem's grader:
1. Validates Stripe SDK version is 15.x
2. Starts the server on port 4242
3. Runs RSpec tests against HTTP endpoints
4. Returns pass/fail based on response format

## Leak Detection

UUIDs are embedded in grader/solution files to detect leaks:

**charges-on-payment-intent** (UUID `0891efcc-7898-4eb6-9700-dd889d098897`):
- Grader: `sdk-upgrades-ruby-charges-on-payment-intent-0891efcc-7898-4eb6-9700-dd889d098897-grader`
- Solution: `sdk-upgrades-ruby-charges-on-payment-intent-0891efcc-7898-4eb6-9700-dd889d098897-solution`

**invoice-partial-payments** (UUID `b8f99b7e-2b4c-4f8c-82ad-7c922686de83`):
- Grader: `sdk-upgrades-ruby-invoice-partial-payments-b8f99b7e-2b4c-4f8c-82ad-7c922686de83-grader`
- Solution: `sdk-upgrades-ruby-invoice-partial-payments-b8f99b7e-2b4c-4f8c-82ad-7c922686de83-solution`

**subscription-billing-migration** (UUID `c3efe58e-a583-4031-83cc-bd4e49e13305`):
- Grader: `sdk-upgrades-ruby-subscription-billing-migration-c3efe58e-a583-4031-83cc-bd4e49e13305-grader`
- Solution: `sdk-upgrades-ruby-subscription-billing-migration-c3efe58e-a583-4031-83cc-bd4e49e13305-solution`

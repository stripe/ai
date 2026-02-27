# SDK Upgrades - Java

This eval tests the ability to upgrade a Java application from Stripe SDK v20.x/v27.x to v29.x.

## Problems

1. **charges-on-payment-intent** - Update code that uses the deprecated `paymentIntent.getCharges()` method (removed in newer API versions). Must use `Charge.list()` or `latestChargeObject` instead.

2. **invoice-partial-payments** - Update invoice-related code to work with SDK v29.x

3. **subscription-billing-migration** - Update subscription-related code to work with SDK v29.x

## SDK Versions

| Before | After |
|--------|-------|
| stripe-java v20.x/v27.x | stripe-java v29.0.0 |
| API 2022-08-01 | API 2025-03-31.basil |

## Prerequisites

- JDK 11+
- Maven 3.x
- Ruby 3.x and Bundler (for the grader)

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

### 2. Build and Run the Server

```bash
cd environment/$PROBLEM/server
mvn install -DskipTests
mvn exec:java -Dexec.mainClass="com.stripe.sample.Server"
```

The server starts on `http://localhost:4242`. Verify it's running:

```bash
curl http://localhost:4242/config
```

### 3. Run the Grader (should fail on the initial environment)

In a separate terminal, from the `sdk-upgrades-java/` root:

```bash
# Copy .env so the grader can access Stripe API keys
cp environment/$PROBLEM/server/.env grader/.env

# Install grader dependencies (first time only)
cd grader
bundle install

# Run the grader RSpec tests directly against the running server
bundle exec rspec $PROBLEM/grade.rb --format documentation
```

## Docker Setup (run_solution.sh)

The Docker workflow tests both the unmodified environment (should fail) and the reference solution (should pass) automatically.

### Option A: Using a .env file (preferred)

Create a `.env` file in the `sdk-upgrades-java/` root directory:

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
export STRIPE_SECRET_KEY=sk_test_...
./run_solution.sh
```

The Docker container will:
1. Build and start each problem's server with the **old SDK** (environment) and run the grader -- expects failure
2. Build and start each problem's server with the **new SDK** (solution) and run the grader -- expects pass

## Structure

```
sdk-upgrades-java/
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
1. Validates Stripe SDK version is 29.x (fails immediately if not)
2. Starts the Java server on port 4242
3. Runs RSpec tests against HTTP endpoints
4. Returns pass/fail based on response correctness

## Leak Detection

UUIDs are embedded in grader/solution files to detect leaks:

**charges-on-payment-intent** (UUID `284c2a9a-b3ea-4767-b334-7d8b18535229`):
- Grader: `sdk-upgrades-java-charges-on-payment-intent-284c2a9a-b3ea-4767-b334-7d8b18535229-grader`
- Solution: `sdk-upgrades-java-charges-on-payment-intent-284c2a9a-b3ea-4767-b334-7d8b18535229-solution`

**invoice-partial-payments** (UUID `7c08d1f4-962c-4f27-b31f-4edd6a5149bc`):
- Grader: `sdk-upgrades-java-invoice-partial-payments-7c08d1f4-962c-4f27-b31f-4edd6a5149bc-grader`
- Solution: `sdk-upgrades-java-invoice-partial-payments-7c08d1f4-962c-4f27-b31f-4edd6a5149bc-solution`

**subscription-billing-migration** (UUID `f73c1831-b6af-4f3a-b1ad-e957b12027e6`):
- Grader: `sdk-upgrades-java-subscription-billing-migration-f73c1831-b6af-4f3a-b1ad-e957b12027e6-grader`
- Solution: `sdk-upgrades-java-subscription-billing-migration-f73c1831-b6af-4f3a-b1ad-e957b12027e6-solution`

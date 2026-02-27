# SDK Upgrades - .NET

This eval tests the ability to upgrade a .NET application from Stripe SDK v40.x/v46.x to v48.x.

## Problems

1. **charges-on-payment-intent** - Update code that uses the deprecated `paymentIntent.Charges` property (removed in newer API versions). Must use `Charge.List()` or `LatestChargeObject` instead.

2. **invoice-partial-payments** - Update invoice-related code to work with SDK v48.x

3. **subscription-billing-migration** - Update subscription-related code to work with SDK v48.x

## SDK Versions

| Before | After |
|--------|-------|
| Stripe.net v40.x/v46.x | Stripe.net v48.0.0 |
| API 2022-08-01 / 2024-11-20.acacia | API 2025-03-31.basil |

## Prerequisites

- .NET 8.0 SDK
- Ruby 3.x and Bundler (for the grader)

## Local Setup

Each problem lives in `environment/<problem>/server/`. To run a problem locally:

### 1. Configure Stripe API Keys

```bash
# Pick a problem to work on
export PROBLEM=charges-on-payment-intent  # or invoice-partial-payments, subscription-billing-migration

# Create .env from the example (or edit the existing .env)
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
dotnet restore
dotnet run
```

The server starts on `http://localhost:4242`. Verify it's running:

```bash
curl http://localhost:4242/config
```

### 3. Run the Grader (should fail on the initial environment)

In a separate terminal, from the `sdk-upgrades-dotnet/` root:

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

Create a `.env` file in the `sdk-upgrades-dotnet/` root directory:

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
sdk-upgrades-dotnet/
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
1. Validates Stripe SDK version is 48.x (fails immediately if not)
2. Starts the .NET server on port 4242
3. Runs RSpec tests against HTTP endpoints
4. Returns pass/fail based on response correctness

## Leak Detection

UUIDs are embedded in grader/solution files to detect leaks:

**charges-on-payment-intent** (UUID `e3bc2533-5e5b-4604-985f-2ac3cad94ee0`):
- Grader: `sdk-upgrades-dotnet-charges-on-payment-intent-e3bc2533-5e5b-4604-985f-2ac3cad94ee0-grader`
- Solution: `sdk-upgrades-dotnet-charges-on-payment-intent-e3bc2533-5e5b-4604-985f-2ac3cad94ee0-solution`

**invoice-partial-payments** (UUID `a5a50cf2-0f05-44f2-9540-b243c83c28a2`):
- Grader: `sdk-upgrades-dotnet-invoice-partial-payments-a5a50cf2-0f05-44f2-9540-b243c83c28a2-grader`
- Solution: `sdk-upgrades-dotnet-invoice-partial-payments-a5a50cf2-0f05-44f2-9540-b243c83c28a2-solution`

**subscription-billing-migration** (UUID `ad7e4461-df0d-4731-b1a9-b099c5ef3858`):
- Grader: `sdk-upgrades-dotnet-subscription-billing-migration-ad7e4461-df0d-4731-b1a9-b099c5ef3858-grader`
- Solution: `sdk-upgrades-dotnet-subscription-billing-migration-ad7e4461-df0d-4731-b1a9-b099c5ef3858-solution`

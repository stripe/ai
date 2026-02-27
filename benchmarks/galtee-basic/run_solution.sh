#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_NAME="galtee-basic"
ENV_FILE="$SCRIPT_DIR/environment/server/.env"

# Check if .env file exists and has real API keys
check_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        echo "ERROR: .env file not found at $ENV_FILE"
        echo "Copy .env.example to .env and add your Stripe API keys:"
        echo "  cp $SCRIPT_DIR/environment/server/.env.example $ENV_FILE"
        exit 1
    fi

    # Check for placeholder values
    if grep -q "pk_test_your_publishable_key_here\|sk_test_your_secret_key_here" "$ENV_FILE"; then
        echo "ERROR: .env file contains placeholder values"
        echo "Please update $ENV_FILE with your actual Stripe API keys"
        exit 1
    fi

    # Check that required keys exist
    if ! grep -q "^STRIPE_SECRET_KEY=sk_test_" "$ENV_FILE"; then
        echo "ERROR: STRIPE_SECRET_KEY not properly configured in $ENV_FILE"
        echo "Expected format: STRIPE_SECRET_KEY=sk_test_..."
        exit 1
    fi

    if ! grep -q "^STRIPE_PUBLISHABLE_KEY=pk_test_" "$ENV_FILE"; then
        echo "ERROR: STRIPE_PUBLISHABLE_KEY not properly configured in $ENV_FILE"
        echo "Expected format: STRIPE_PUBLISHABLE_KEY=pk_test_..."
        exit 1
    fi

    echo "=== .env file validated ==="
}

check_env

echo "=== Building Docker image ==="
docker build -t "clean-eval-$EVAL_NAME" "$SCRIPT_DIR"

echo ""
echo "=== Running eval test ==="
echo "(This will test that grader fails without solution, then passes with solution)"
echo ""

# The .env file in environment/server has working test keys
# Users can override by passing environment variables
docker run --rm \
    ${STRIPE_SECRET_KEY:+-e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"} \
    ${STRIPE_PUBLISHABLE_KEY:+-e STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY"} \
    "clean-eval-$EVAL_NAME"

echo ""
echo "=== Done ==="

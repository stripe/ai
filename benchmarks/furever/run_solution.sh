#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_NAME="furever"
ENV_FILE="$SCRIPT_DIR/environment/.env"

# Check if .env file exists and has real API keys
check_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        echo "ERROR: .env file not found at $ENV_FILE"
        echo "Copy .env.example to .env and add your Stripe API keys:"
        echo "  cp $SCRIPT_DIR/environment/.env.example $ENV_FILE"
        exit 1
    fi

    # Check for placeholder values
    if grep -q "sk_INSERT_YOUR_SECRET_KEY\|pk_INSERT_YOUR_PUBLISHABLE_KEY" "$ENV_FILE"; then
        echo "ERROR: .env file contains placeholder values"
        echo "Please update $ENV_FILE with your actual Stripe API keys"
        exit 1
    fi

    # Check that required keys exist
    if ! grep -q "^STRIPE_SECRET_KEY=.*sk_test_" "$ENV_FILE"; then
        echo "ERROR: STRIPE_SECRET_KEY not properly configured in $ENV_FILE"
        echo "Expected format: STRIPE_SECRET_KEY=\"sk_test_...\""
        exit 1
    fi

    if ! grep -q "^STRIPE_PUBLIC_KEY=.*pk_test_" "$ENV_FILE"; then
        echo "ERROR: STRIPE_PUBLIC_KEY not properly configured in $ENV_FILE"
        echo "Expected format: STRIPE_PUBLIC_KEY=\"pk_test_...\""
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

# Source .env to get variable values for Docker
set -a
source "$ENV_FILE"
set +a

# Furever requires Stripe keys and other env vars
docker run --rm \
    ${STRIPE_SECRET_KEY:+-e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"} \
    ${STRIPE_PUBLIC_KEY:+-e STRIPE_PUBLIC_KEY="$STRIPE_PUBLIC_KEY"} \
    ${NEXTAUTH_SECRET:+-e NEXTAUTH_SECRET="$NEXTAUTH_SECRET"} \
    "clean-eval-$EVAL_NAME"

echo ""
echo "=== Done ==="

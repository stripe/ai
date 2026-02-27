#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_NAME="saas-starter-embedded-checkout"

echo "=== Building Docker image ==="
docker build -t "clean-eval-$EVAL_NAME" "$SCRIPT_DIR"

echo ""
echo "=== Running test ==="
echo "(This will test that grader fails without valid session)"
echo ""

# Pass through Stripe keys from environment
docker run --rm \
    ${STRIPE_SECRET_KEY:+-e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"} \
    "clean-eval-$EVAL_NAME"

echo ""
echo "=== Done ==="

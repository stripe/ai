#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_NAME="sdk-upgrades-java"

echo "=== Building Docker image ==="
docker build -t "clean-eval-$EVAL_NAME" "$SCRIPT_DIR"

echo ""
echo "=== Running tests ==="
echo "(This will test without solution, then with solution)"
echo ""

# Build docker run command with optional .env file mount
DOCKER_ARGS="--rm"

# Pass through Stripe keys from environment
if [ -n "$STRIPE_SECRET_KEY" ]; then
    DOCKER_ARGS="$DOCKER_ARGS -e STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY"
fi

# If sibling .env file exists, mount it into the container
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "Found .env file, mounting into container..."
    DOCKER_ARGS="$DOCKER_ARGS -v $SCRIPT_DIR/.env:/eval/.env:ro"
fi

docker run $DOCKER_ARGS "clean-eval-$EVAL_NAME"

echo ""
echo "=== Done ==="

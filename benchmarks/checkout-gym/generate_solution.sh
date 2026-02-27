#!/bin/bash
# Generate solution.json for the checkout-gym eval
#
# This script creates products in Stripe and generates the solution file
# with the correct price IDs for the current Stripe account.
#
# Prerequisites:
#   - environment/server/.env must exist with valid Stripe API keys
#   - Ruby and bundler must be installed
#   - Run `bundle install` in environment/server/ first

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/environment/server"

# Check for .env file
if [ ! -f "$SERVER_DIR/.env" ]; then
    echo "Error: $SERVER_DIR/.env not found"
    echo ""
    echo "To set up:"
    echo "  1. Copy $SERVER_DIR/.env.example to $SERVER_DIR/.env"
    echo "  2. Add valid Stripe API keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)"
    exit 1
fi

# Check that STRIPE_SECRET_KEY is set and not a placeholder
if ! grep -q "^STRIPE_SECRET_KEY=sk_test_" "$SERVER_DIR/.env"; then
    echo "Error: STRIPE_SECRET_KEY in .env appears to be a placeholder"
    echo "Please add a valid Stripe test secret key"
    exit 1
fi

echo "=== Generating solution for checkout-gym ==="
echo ""

# Ensure solution directory exists
mkdir -p "$SCRIPT_DIR/solution"

# Delete existing catalog to force regeneration with current API keys
if [ -f "$SERVER_DIR/product_catalog.json" ]; then
    echo "Removing existing product_catalog.json to regenerate with current API keys..."
    rm "$SERVER_DIR/product_catalog.json"
fi

# Generate solution from evaluations.rb
cd "$SERVER_DIR"
echo "Creating products in Stripe and generating solution..."
bundle exec ruby evaluations.rb --export "$SCRIPT_DIR/solution/submission.json"

# Also regenerate the environment's submission.json (empty variant with example_payment pre-filled)
# so the example_payment entry has the correct price ID for the current Stripe account
echo "Regenerating environment submission.json with current price IDs..."
bundle exec ruby evaluations.rb --export-empty "$SERVER_DIR/submission.json"

echo ""
echo "=== Done ==="
echo "Solution written to: solution/submission.json"
echo "Environment submission written to: environment/server/submission.json"
echo "Product catalog written to: environment/server/product_catalog.json"

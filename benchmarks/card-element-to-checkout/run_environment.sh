#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_NAME="card-element-to-checkout"

echo "=== Building Docker image ==="
docker build -t "clean-eval-$EVAL_NAME" "$SCRIPT_DIR"

echo ""
echo "=== Starting environment server on http://localhost:5000 ==="

docker run --rm -p 5000:4242 \
    ${STRIPE_SECRET_KEY:+-e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"} \
    ${STRIPE_PUBLISHABLE_KEY:+-e STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY"} \
    "clean-eval-$EVAL_NAME" \
    bash -c '
        # Create .env for environment server
        cat > /eval/environment/server/.env << EOF
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder}
DB_NAME=db.sqlite3
STATIC_DIR=client
FLASK_HOST=0.0.0.0
FLASK_PORT=4242
EOF

        # Init Stripe products
        cd /eval
        python environment/init_products.py

        # Start environment server in foreground
        cd /eval/environment/server
        python main.py
    '

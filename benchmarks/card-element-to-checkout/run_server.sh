#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_NAME="card-element-to-checkout"

echo "=== Building Docker image ==="
docker build -t "clean-eval-$EVAL_NAME" "$SCRIPT_DIR"

echo ""
echo "=== Starting solution server on http://localhost:5000 ==="

docker run --rm -p 5000:4242 \
    ${STRIPE_SECRET_KEY:+-e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"} \
    ${STRIPE_PUBLISHABLE_KEY:+-e STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY"} \
    "clean-eval-$EVAL_NAME" \
    bash -c '
        # Create .env for solution server
        cat > /eval/solution/server/.env << EOF
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder}
DB_NAME=/eval/solution/server/db.sqlite3
STATIC_DIR=client
FLASK_HOST=0.0.0.0
FLASK_PORT=4242
EOF

        # Init Stripe products (writes to environment DB)
        cd /eval
        python environment/init_products.py

        # Copy updated DB to solution server so it has the new Stripe price IDs
        cp environment/server/db.sqlite3 solution/server/db.sqlite3

        # Start solution server in foreground
        cd /eval/solution/server
        python main.py
    '

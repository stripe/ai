#!/bin/bash
set -e

echo "=== Starting services ==="

# Start PostgreSQL
service postgresql start
sleep 3  # Wait for PostgreSQL to be ready

# Create database user and database
sudo -u postgres psql -c "CREATE USER model WITH PASSWORD 'password' CREATEDB;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE saas_db OWNER model;" 2>/dev/null || true

# Start Xvfb
Xvfb :99 -screen 0 1920x1080x24 &
sleep 2

# Setup workdir
mkdir -p /workdir/bin
ln -sf /usr/local/bin/geckodriver /workdir/bin/geckodriver

echo "=== Testing grader WITHOUT solution (should fail) ==="

# Copy environment to temp
rm -rf /tmp/eval_test
cp -r /eval /tmp/eval_test

# Create .env file with required variables
cd /tmp/eval_test/environment
cat > .env << EOF
POSTGRES_URL=postgresql://model:password@localhost:5432/saas_db
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
AUTH_SECRET=test-secret-key-for-jwt-signing
BASE_URL=http://localhost:3000
EOF

echo "Building Next.js app (this may take a moment)..."
pnpm run build 2>&1 || {
    echo "ERROR: Build failed. Make sure STRIPE_SECRET_KEY is set correctly."
    exit 1
}

# Run database migrations
echo "Running database migrations..."
pnpm run db:migrate 2>&1 || echo "Migration may have failed - continuing..."

# Start Next.js server
echo "Starting server..."
pnpm run start &
SERVER_PID=$!
sleep 10

# Run grader - should fail (no valid invoice ID)
# This eval uses invoice IDs (in_*) for grading partial payments
cd /tmp/eval_test/grader
echo "Running grader with placeholder invoice ID (should fail)..."
if ./grade.sh "in_test_placeholder" 2>&1; then
    echo "ERROR: Grader should have failed without valid invoice!"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
echo "PASS: Grader correctly failed without solution"

# Cleanup
kill $SERVER_PID 2>/dev/null || true
pkill -9 -f "next" 2>/dev/null || true
pkill -9 -f "node" 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 5

echo ""
echo "=== Docker infrastructure test complete ==="
echo "NOTE: Full solution test skipped - requires browser interaction for 2 partial payments"

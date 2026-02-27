#!/bin/bash
set -e

echo "=== Testing grader WITHOUT solution (should fail) ==="

# Copy entire eval structure to temp location
rm -rf /tmp/eval_test
cp -r /eval /tmp/eval_test

# Create workdir expected by grader
mkdir -p /workdir/bin
ln -sf /usr/local/bin/geckodriver /workdir/bin/geckodriver

# Start MongoDB
mkdir -p /data/db
mongod --fork --logpath /var/log/mongod.log

# Start Xvfb for headless browser
Xvfb :99 -screen 0 1920x1080x24 &
sleep 2

# Write .env.local with runtime env vars (NEXT_PUBLIC_* must be present at build time)
cat > /tmp/eval_test/environment/.env.local << EOF
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_PUBLIC_KEY=${STRIPE_PUBLIC_KEY}
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=${STRIPE_PUBLIC_KEY}
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-furever-eval-secret}
APP_NAME=Furever
PORT=3000
SECRET=${NEXTAUTH_SECRET:-furever-eval-secret}
MONGO_URI=mongodb://127.0.0.1:27017/pose
EOF

# Start the Next.js server in dev mode (without solution)
cd /tmp/eval_test/environment
npm run dev &
SERVER_PID=$!
sleep 10  # Wait for server to start

# Run grader (should fail with skeleton code)
cd /tmp/eval_test/grader
if python3 payments.py 2>&1; then
    echo "ERROR: Grader should have failed without solution!"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
echo "PASS: Grader correctly failed without solution"

# Stop the server (use multiple methods to ensure all node processes are killed)
kill $SERVER_PID 2>/dev/null || true
pkill -9 -f "next" 2>/dev/null || true
pkill -9 -f "node" 2>/dev/null || true
# Kill anything on port 3000
fuser -k 3000/tcp 2>/dev/null || true
sleep 5
# Verify port is free
if fuser 3000/tcp 2>/dev/null; then
    echo "WARNING: Port 3000 still in use, attempting force kill"
    fuser -k -9 3000/tcp 2>/dev/null || true
    sleep 2
fi

echo ""
echo "=== Injecting solution ==="

# Clean up stale test results from Phase 1
rm -f /workdir/payment_test_results.json

# Copy solution files over the environment
cp -r /eval/solution/app/* /tmp/eval_test/environment/app/

echo ""
echo "=== Testing grader WITH solution (should pass) ==="

# Start the server with solution in dev mode
cd /tmp/eval_test/environment
npm run dev &
SERVER_PID=$!
sleep 10  # Wait for server to start

# Run grader (should pass with solution)
cd /tmp/eval_test/grader
if python3 payments.py 2>&1; then
    echo ""
    echo "PASS: Grader correctly passed with solution"
    kill $SERVER_PID 2>/dev/null || true
else
    echo ""
    echo "ERROR: Grader should have passed with solution!"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "=== All tests passed ==="

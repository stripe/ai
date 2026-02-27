#!/bin/bash
set -e

echo "=== Subscription Gym - Clean Eval ==="
echo ""

# If .env file was mounted, source STRIPE_SECRET_KEY from it
if [ -z "$STRIPE_SECRET_KEY" ] && [ -f /eval/.env ]; then
    echo "Loading keys from mounted .env file..."
    export $(grep -v '^#' /eval/.env | grep STRIPE_SECRET_KEY | xargs)
fi

# Check if Stripe API key is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "ERROR: STRIPE_SECRET_KEY is not set"
    echo "Either mount a .env file or pass STRIPE_SECRET_KEY as an environment variable."
    exit 1
fi

# Create .env file for solution server
echo "Creating .env file..."
cat > /eval/solution/server/.env << EOF
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_API_VERSION=2025-05-28.basil
STRIPE_WEBHOOK_SECRET=
EOF

# Also create .env for grader (it needs to access Stripe API)
cat > /eval/grader/.env << EOF
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_API_VERSION=2025-05-28.basil
EOF

# Also create .env for environment (products.rb needs it)
cat > /eval/environment/server/.env << EOF
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_API_VERSION=2025-05-28.basil
STRIPE_WEBHOOK_SECRET=
EOF

echo "=== Starting solution server ==="
cd /eval/solution/server
bundle exec ruby server.rb > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:4242/config > /dev/null 2>&1; then
        echo "Server started successfully"
        break
    fi
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "Server failed to start. Logs:"
        cat /tmp/server.log
        exit 1
    fi
    sleep 1
done

# Check if server is running
if ! curl -s http://localhost:4242/config > /dev/null 2>&1; then
    echo "Server failed to respond. Logs:"
    cat /tmp/server.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "=== Running RSpec tests ==="
cd /eval/grader
RESULT=0
bundle exec rspec *_spec.rb --format documentation --format json --out /tmp/rspec_results.json || RESULT=$?

# Kill the server
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "=== Test Results ==="

# Parse results using Ruby
PASSED=$(ruby -rjson -e 'r=JSON.parse(File.read("/tmp/rspec_results.json")); puts r["summary"]["example_count"] - r["summary"]["failure_count"]')
TOTAL=$(ruby -rjson -e 'r=JSON.parse(File.read("/tmp/rspec_results.json")); puts r["summary"]["example_count"]')
FAILED=$(ruby -rjson -e 'r=JSON.parse(File.read("/tmp/rspec_results.json")); puts r["summary"]["failure_count"]')

echo ""
echo "Solution: $PASSED/$TOTAL tests passed"

if [ "$FAILED" -eq 0 ]; then
    echo ""
    echo "=== SUCCESS: All $TOTAL tests passed ==="
    exit 0
else
    echo ""
    echo "=== PARTIAL: $PASSED/$TOTAL tests passed ==="
    echo ""
    echo "Failed tests:"
    ruby -rjson -e '
      r = JSON.parse(File.read("/tmp/rspec_results.json"))
      r["examples"].select { |e| e["status"] == "failed" }.each do |e|
        puts "  - #{e["full_description"]}"
        puts "    Error: #{e["exception"]["message"]}" if e["exception"]
      end
    '
    exit 1
fi

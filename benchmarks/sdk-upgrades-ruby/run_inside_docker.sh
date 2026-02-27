#!/bin/bash
# Script for running full eval initial state & solution keys to validate
set -e

PROBLEMS="charges-on-payment-intent invoice-partial-payments subscription-billing-migration"

echo "=== SDK Upgrades Ruby - Clean Eval ==="
echo ""

# Test WITHOUT solution (should fail version check)
echo "=== Testing WITHOUT solution (should fail) ==="

for problem in $PROBLEMS; do
    echo ""
    echo "--- Testing $problem (environment - old SDK) ---"

    # Copy environment to workdir (simulating what AI would work with)
    rm -rf /workdir
    mkdir -p /workdir/$problem/environment
    cp -r /eval/environment/$problem/* /workdir/$problem/environment/

    cd /workdir/$problem/environment/server

    # Install dependencies
    bundle config set --local path 'vendor/bundle'
    bundle install --quiet 2>/dev/null || true

    # Start server in background
    bundle exec ruby server.rb &
    SERVER_PID=$!
    sleep 3

    # Copy .env to grader directory so grader can use Stripe API
    if [ -f /workdir/$problem/environment/server/.env ]; then
        cp /workdir/$problem/environment/server/.env /eval/grader/.env
    fi

    # Run grader - should fail (old SDK version)
    cd /eval/grader
    if ./$problem/grade.sh -l ruby 2>&1 | grep -q "does not match required version"; then
        echo "PASS: Grader correctly rejected old SDK version for $problem"
    else
        echo "WARN: Grader did not fail as expected for $problem"
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
done

echo ""
echo "=== Testing WITH solution (should pass) ==="

for problem in $PROBLEMS; do
    echo ""
    echo "--- Testing $problem (solution - new SDK v15) ---"

    # Copy solution to workdir
    rm -rf /workdir
    mkdir -p /workdir/$problem/environment
    cp -r /eval/solution/$problem/* /workdir/$problem/environment/

    cd /workdir/$problem/environment/server

    # Install dependencies (uses cached v15 gems)
    bundle config set --local path 'vendor/bundle'
    bundle install --quiet 2>/dev/null || bundle install

    # Start server in background
    bundle exec ruby server.rb &
    SERVER_PID=$!
    sleep 3

    # Copy .env to grader directory so grader can use Stripe API
    if [ -f /workdir/$problem/environment/server/.env ]; then
        cp /workdir/$problem/environment/server/.env /eval/grader/.env
    fi

    # Run grader - should pass
    cd /eval/grader
    if ./$problem/grade.sh -l ruby 2>&1; then
        echo "PASS: Grader passed for $problem"
    else
        echo "FAIL: Grader failed for $problem"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 1
done

echo ""
echo "=== All tests completed ==="

#!/bin/bash
set -e

PROBLEMS="charges-on-payment-intent invoice-partial-payments subscription-billing-migration"

echo "=== SDK Upgrades .NET - Clean Eval ==="
echo ""

# Helper function to ensure .env exists in server directory
ensure_env_file() {
    local server_dir="$1"

    # If server already has .env, use it
    if [ -f "$server_dir/.env" ]; then
        return 0
    fi

    # If root .env exists (mounted from host), copy it
    if [ -f /eval/.env ]; then
        echo "Copying .env from /eval/.env to $server_dir/"
        cp /eval/.env "$server_dir/.env"
        return 0
    fi

    # If STRIPE_SECRET_KEY env var is set, create .env from it
    if [ -n "$STRIPE_SECRET_KEY" ]; then
        echo "Creating .env from environment variable in $server_dir/"
        cat > "$server_dir/.env" << EOF
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY:-pk_test_placeholder}
EOF
        return 0
    fi

    echo "WARNING: No .env file available for $server_dir"
    return 1
}

# Test WITHOUT solution (should fail version check)
echo "=== Testing WITHOUT solution (should fail) ==="

for problem in $PROBLEMS; do
    echo ""
    echo "--- Testing $problem (environment - old SDK) ---"

    # Copy environment to workdir
    rm -rf /workdir
    mkdir -p /workdir/$problem/environment
    cp -r /eval/environment/$problem/* /workdir/$problem/environment/

    cd /workdir/$problem/environment/server

    # Ensure .env file exists
    ensure_env_file "$(pwd)"

    # Restore and build (may fail for environment code - that's expected)
    dotnet restore -v q 2>/dev/null || dotnet restore || true
    if dotnet build -v q 2>/dev/null || dotnet build; then
        # Start server in background
        dotnet run --no-build &
        SERVER_PID=$!
        sleep 5

        # Copy .env to grader directory so grader can use Stripe API
        if [ -f /workdir/$problem/environment/server/.env ]; then
            cp /workdir/$problem/environment/server/.env /eval/grader/.env
        fi

        # Run grader - should fail (old SDK version)
        cd /eval/grader
        if ./$problem/grade.sh -l dotnet 2>&1 | grep -q "does not match required version"; then
            echo "PASS: Grader correctly rejected old SDK version for $problem"
        else
            echo "WARN: Grader did not fail as expected for $problem"
        fi
    else
        echo "PASS: Environment build failed (expected for old SDK incompatible code) for $problem"
        SERVER_PID=""
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    pkill -f "dotnet" 2>/dev/null || true
    sleep 2
done

echo ""
echo "=== Testing WITH solution (should pass) ==="

for problem in $PROBLEMS; do
    echo ""
    echo "--- Testing $problem (solution - new SDK v48) ---"

    # Copy solution to workdir
    rm -rf /workdir
    mkdir -p /workdir/$problem/environment
    cp -r /eval/solution/$problem/* /workdir/$problem/environment/

    cd /workdir/$problem/environment/server

    # Ensure .env file exists
    ensure_env_file "$(pwd)"

    # Restore and build
    dotnet restore -v q 2>/dev/null || dotnet restore
    dotnet build -v q 2>/dev/null || dotnet build

    # Start server in background
    dotnet run --no-build &
    SERVER_PID=$!
    sleep 5

    # Copy .env to grader directory so grader can use Stripe API
    if [ -f /workdir/$problem/environment/server/.env ]; then
        cp /workdir/$problem/environment/server/.env /eval/grader/.env
    fi

    # Run grader - should pass
    cd /eval/grader
    if ./$problem/grade.sh -l dotnet 2>&1; then
        echo "PASS: Grader passed for $problem"
    else
        echo "FAIL: Grader failed for $problem"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    pkill -f "dotnet" 2>/dev/null || true
    sleep 2
done

echo ""
echo "=== All tests completed ==="

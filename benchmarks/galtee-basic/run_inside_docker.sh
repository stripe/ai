#!/bin/bash
set -e

echo "=== Testing grader WITHOUT solution (should fail) ==="

# Copy entire eval structure to temp location
rm -rf /tmp/eval_test
cp -r /eval /tmp/eval_test

# Run grader from temp location (should fail with skeleton code)
cd /tmp/eval_test/grader
if ./grade.sh 2>&1; then
    echo "ERROR: Grader should have failed without solution!"
    exit 1
fi
echo "PASS: Grader correctly failed without solution"

echo ""
echo "=== Injecting solution ==="

# Kill any remaining server processes on port 4242
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# Copy solution files over the environment
cp /eval/solution/server.js /tmp/eval_test/environment/server/server.js
cp /eval/solution/package.json /tmp/eval_test/environment/server/package.json
cp /eval/solution/galtee_data.db /tmp/eval_test/environment/db/galtee_data.db

# Install any new dependencies from solution's package.json
cd /tmp/eval_test/environment/server && npm install --silent

echo ""
echo "=== Testing grader WITH solution (should pass) ==="

cd /tmp/eval_test/grader
if ./grade.sh 2>&1; then
    echo ""
    echo "PASS: Grader correctly passed with solution"
else
    echo ""
    echo "ERROR: Grader should have passed with solution!"
    exit 1
fi

echo ""
echo "=== All tests passed ==="

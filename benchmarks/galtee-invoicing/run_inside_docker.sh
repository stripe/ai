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
pkill -9 -f "node.*server\.js" 2>/dev/null || true
sleep 1
# Wait until port 4242 is actually free
for i in $(seq 1 10); do
  nc -z localhost 4242 2>/dev/null || break
  echo "Waiting for port 4242 to be freed..."
  sleep 1
done

# Copy solution files over the environment server
cp /eval/solution/server.js /tmp/eval_test/environment/server/server.js
cp /eval/solution/migrate.js /tmp/eval_test/environment/server/migrate.js
cp /eval/solution/package.json /tmp/eval_test/environment/server/package.json

# Reinstall deps (solution may have different dependencies)
cd /tmp/eval_test/environment/server && npm install

# Reset the database to original state
cp /eval/environment/db/galtee_data.db /tmp/eval_test/environment/db/galtee_data.db

echo ""
echo "=== Running migration ==="

cd /tmp/eval_test/environment/server
node migrate.js

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

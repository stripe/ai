#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

npm --prefix "$SCRIPT_DIR/../server" start > /dev/null 2>&1 &
SERVER_PID=$!

PORT=4242
until nc -z localhost "$PORT"; do
  sleep 0.2
done

pushd "$SCRIPT_DIR" > /dev/null
rspec server_spec.rb
RSPEC_EXIT_CODE=$?
popd > /dev/null

kill $SERVER_PID 2>/dev/null
pkill -f "node.*server\.js" 2>/dev/null || true

exit $RSPEC_EXIT_CODE

#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[validate.sh] SCRIPT_DIR=$SCRIPT_DIR"
echo "[validate.sh] Starting Node server: npm --prefix \"$SCRIPT_DIR/../server\" start"
npm --prefix "$SCRIPT_DIR/../server" start > /dev/null 2>&1 &
SERVER_PID=$!

PORT=${PORT:-4242}
echo "[validate.sh] Waiting for server to listen on localhost:$PORT ..."
until nc -z localhost "$PORT"; do
  sleep 0.5
done
echo "[validate.sh] Server is listening on port $PORT"

pushd "$SCRIPT_DIR" > /dev/null
echo "[validate.sh] Running: bundle exec rspec server_spec.rb"
bundle exec rspec server_spec.rb
RSPEC_EXIT_CODE=$?
popd > /dev/null

echo "[validate.sh] Stopping server (PID $SERVER_PID)"
kill $SERVER_PID
echo "[validate.sh] RSpec exit code: $RSPEC_EXIT_CODE"

exit $RSPEC_EXIT_CODE

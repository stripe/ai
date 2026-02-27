#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

npm --prefix "$SCRIPT_DIR/../environment/server" start > /dev/null 2>&1 &
SERVER_PID=$!

PORT=${PORT:-4242}
until nc -z localhost "$PORT"; do
  sleep 0.2
done

pushd "$SCRIPT_DIR" > /dev/null
bundle exec rspec spec/grade.rb --format json --out /tmp/rspec_results.json
RSPEC_EXIT_CODE=$?
popd > /dev/null

if [ -f /tmp/rspec_results.json ]; then
  ruby "$SCRIPT_DIR/print_rspec_results.rb" /tmp/rspec_results.json
fi

kill $SERVER_PID

exit $RSPEC_EXIT_CODE

#!/bin/bash
# TODO: check that file that llm writes to is populated / well formed

# Check if either checkout session ID or invoice ID is provided
if [ -z "$1" ]; then
    echo "Error: Either checkout session ID or invoice ID is required"
    echo "Usage: $0 <checkout_session_id|invoice_id>"
    exit 1
fi

ID="$1"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Determine which type of ID was provided and run appropriate tests
if [[ $ID == cs_* ]]; then
    echo "Testing checkout session: $ID"
    pytest checkout_tests.py --checkout-session-id="$ID" --json-report --json-report-file=/tmp/pytest_results.json
elif [[ $ID == in_* ]]; then
    echo "Testing invoice: $ID"
    pytest invoice_tests.py --invoice-id="$ID" --json-report --json-report-file=/tmp/pytest_results.json
else
    echo "Error: ID must start with 'cs_' (checkout session) or 'in_' (invoice)"
    exit 1
fi
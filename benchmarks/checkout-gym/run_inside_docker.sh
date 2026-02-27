#!/bin/bash
set -e

echo "=== Checkout Gym - Clean Eval ==="
echo ""

# Test WITHOUT solution (should get low score)
echo "=== Testing WITHOUT solution (empty submission - should get ~0%) ==="

# Copy empty submission to grader directory
cp /eval/environment/server/submission.json /eval/grader/submission.json

# Run grader
cd /eval/grader
echo "Running grader with empty submission..."
RESULT=$(bundle exec ruby grade.rb | ruby -e 'input = STDIN.read; puts input[input.index("[")..]')

# Count zero scores using Ruby to parse JSON properly
ZERO_SCORES=$(echo "$RESULT" | ruby -rjson -e 'puts JSON.parse(STDIN.read).count{|r| r["score"] == 0.0}')
TOTAL_CHALLENGES=$(echo "$RESULT" | ruby -rjson -e 'puts JSON.parse(STDIN.read).length')

echo "Empty submission: $ZERO_SCORES/$TOTAL_CHALLENGES challenges have score 0"
if [ "$ZERO_SCORES" -gt 20 ]; then
    echo "PASS: Most challenges correctly scored 0 for empty submission"
else
    echo "NOTE: example_payment is pre-filled as an example (expected)"
fi

echo ""
echo "=== Testing WITH solution (should get 100%) ==="

# Copy solution to grader directory
cp /eval/solution/submission.json /eval/grader/submission.json

# Run grader
cd /eval/grader
echo "Running grader with solution..."
RESULT=$(bundle exec ruby grade.rb | ruby -e 'input = STDIN.read; puts input[input.index("[")..]')

# Count perfect scores using Ruby to parse JSON properly
PERFECT_SCORES=$(echo "$RESULT" | ruby -rjson -e 'puts JSON.parse(STDIN.read).count{|r| r["score"] == 1.0}')
TOTAL_CHALLENGES=$(echo "$RESULT" | ruby -rjson -e 'puts JSON.parse(STDIN.read).length')

echo ""
echo "Solution: $PERFECT_SCORES/$TOTAL_CHALLENGES challenges passed (score = 1.0)"

if [ "$PERFECT_SCORES" -eq "$TOTAL_CHALLENGES" ]; then
    echo ""
    echo "=== SUCCESS: All $TOTAL_CHALLENGES challenges passed ==="
    exit 0
else
    echo ""
    echo "=== PARTIAL: $PERFECT_SCORES/$TOTAL_CHALLENGES challenges passed ==="
    # Show details for failed challenges
    echo ""
    echo "Details for challenges with score < 1.0:"
    echo "$RESULT" | ruby -rjson -e 'JSON.parse(STDIN.read).select{|c| c["score"] < 1.0}.each{|c| puts "  #{c["challenge_name"]}: #{c["score"]} (#{c["matched"]}/#{c["total"]})"}'
    exit 1
fi

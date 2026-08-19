#!/usr/bin/env bash
# feedback-stop.sh — plugin Stop hook for the feedback-eval/stop experiment.
#
# Reads the Stop hook's JSON event from stdin, scores the *parent* session's
# transcript for Stripe-feedback eligibility, always records an observation,
# and — only on the first pass through this stop (stop_hook_active == false)
# and only when eligible — blocks once to ask the parent agent to decide for
# itself whether it has concrete, session-grounded feedback worth submitting.
#
# This script never calls `stripe feedback` itself; it only asks the agent
# to consider it. It never blocks a second time for the same stop.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=feedback-common.sh
source "$SCRIPT_DIR/feedback-common.sh"

INPUT="$(cat)"

TRANSCRIPT_PATH="$(jq -r '.transcript_path // ""' <<<"$INPUT")"
STOP_HOOK_ACTIVE="$(jq -r '.stop_hook_active // false' <<<"$INPUT")"
SESSION_ID="$(jq -r '.session_id // ""' <<<"$INPUT")"

ELIGIBILITY="$("$SCRIPT_DIR/feedback-transcript.sh" "$TRANSCRIPT_PATH" main)"
ELIGIBLE="$(jq -r '.eligible' <<<"$ELIGIBILITY")"

EVENT="$(jq -c -n \
  --arg hook_event_name "Stop" \
  --arg transcript_kind "main" \
  --arg session_id "$SESSION_ID" \
  --arg transcript_path "$TRANSCRIPT_PATH" \
  --argjson stop_hook_active "$STOP_HOOK_ACTIVE" \
  --argjson eligibility "$ELIGIBILITY" \
  '{
    hook_event_name: $hook_event_name,
    transcript_kind: $transcript_kind,
    session_id: $session_id,
    transcript_path: $transcript_path,
    stop_hook_active: $stop_hook_active,
    eligibility: $eligibility
  }')"

printf '%s' "$EVENT" | "$SCRIPT_DIR/feedback-observation.sh"

# Ineligible: nothing to ask about, let the agent stop.
if [[ "$ELIGIBLE" != "true" ]]; then
  exit 0
fi

# Already re-entered once for this stop: never block twice, just let it go.
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

REASON='Before stopping: this session looks like it may involve concrete, agent-attributed Stripe feedback (e.g. an error, workaround, missing capability, or a clearly positive outcome tied to a Stripe skill, MCP call, or CLI command in this session). Decide for yourself whether that is actually true and worth reporting. If so, run `stripe feedback --help` to see the available parameters and submit feedback grounded in what happened in this session. If not, just stop normally.'

jq -cn --arg reason "$REASON" '{decision: "block", reason: $reason}'
exit 0

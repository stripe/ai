#!/usr/bin/env bash
# feedback-subagent-stop.sh — plugin SubagentStop hook for the
# feedback-eval/subagent-stop experiment.
#
# Reads the SubagentStop hook's JSON event from stdin. Its primary evidence
# source is the *subagent's own* transcript (agent_transcript_path), not the
# parent session's transcript_path — a subagent's Stripe interactions live
# in its own nested subagents/ transcript file, not the parent's.
#
# Always records an observation (session_id, agent_id, agent_type,
# transcript kind "subagent", eligibility result, observed interactions).
# Only blocks the subagent once, and only when eligible and
# stop_hook_active is false, asking that subagent to decide for itself
# whether it has concrete feedback from its own work. Never injects
# anything into the parent session and never calls `stripe feedback` itself.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=feedback-common.sh
source "$SCRIPT_DIR/feedback-common.sh"

INPUT="$(cat)"

AGENT_TRANSCRIPT_PATH="$(jq -r '.agent_transcript_path // ""' <<<"$INPUT")"
STOP_HOOK_ACTIVE="$(jq -r '.stop_hook_active // false' <<<"$INPUT")"
SESSION_ID="$(jq -r '.session_id // ""' <<<"$INPUT")"
AGENT_ID="$(jq -r '.agent_id // ""' <<<"$INPUT")"
AGENT_TYPE="$(jq -r '.agent_type // ""' <<<"$INPUT")"

ELIGIBILITY="$("$SCRIPT_DIR/feedback-transcript.sh" "$AGENT_TRANSCRIPT_PATH" subagent)"
ELIGIBLE="$(jq -r '.eligible' <<<"$ELIGIBILITY")"

EVENT="$(jq -c -n \
  --arg hook_event_name "SubagentStop" \
  --arg transcript_kind "subagent" \
  --arg session_id "$SESSION_ID" \
  --arg agent_id "$AGENT_ID" \
  --arg agent_type "$AGENT_TYPE" \
  --arg agent_transcript_path "$AGENT_TRANSCRIPT_PATH" \
  --argjson stop_hook_active "$STOP_HOOK_ACTIVE" \
  --argjson eligibility "$ELIGIBILITY" \
  '{
    hook_event_name: $hook_event_name,
    transcript_kind: $transcript_kind,
    session_id: $session_id,
    agent_id: $agent_id,
    agent_type: $agent_type,
    agent_transcript_path: $agent_transcript_path,
    stop_hook_active: $stop_hook_active,
    eligibility: $eligibility
  }')"

printf '%s' "$EVENT" | "$SCRIPT_DIR/feedback-observation.sh"

# Ineligible: nothing to ask about, let the subagent stop.
if [[ "$ELIGIBLE" != "true" ]]; then
  exit 0
fi

# Already re-entered once for this stop: never block twice.
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
  exit 0
fi

REASON='Before stopping: your own work in this subagent run looks like it may involve concrete feedback about Stripe (e.g. an error, workaround, missing capability, or a clearly positive outcome tied to a Stripe skill, MCP call, or CLI command you used). Decide for yourself, based only on your own work, whether that is actually true and worth reporting. If so, run `stripe feedback --help` to see the available parameters and submit feedback grounded in what happened in your work. If not, just stop normally. Do not report anything on behalf of the parent session.'

jq -cn --arg reason "$REASON" '{decision: "block", reason: $reason}'
exit 0

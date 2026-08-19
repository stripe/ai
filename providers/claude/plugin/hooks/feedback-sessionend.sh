#!/usr/bin/env bash
# feedback-sessionend.sh — plugin SessionEnd hook for feedback-eval/stop.
#
# Observation-only: records that the session ended (and why) so the
# .stripe-feedback-eval journal has a terminal marker for sessions that were
# cleared, resumed away from, logged out of, or otherwise closed — including
# ones that never hit a normal Stop. Never blocks (SessionEnd has no
# decision control anyway), never calls `stripe feedback`, and does no
# transcript parsing, so it stays well inside the 1.5s SessionEnd budget.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=feedback-common.sh
source "$SCRIPT_DIR/feedback-common.sh"

INPUT="$(cat)"

EVENT="$(jq -c '{
  hook_event_name: "SessionEnd",
  session_id: (.session_id // ""),
  transcript_path: (.transcript_path // ""),
  session_end_reason: (.reason // "unknown")
}' <<<"$INPUT" 2>/dev/null || printf '{"hook_event_name":"SessionEnd","unparsable_input":true}')"

printf '%s' "$EVENT" | "$SCRIPT_DIR/feedback-observation.sh"
exit 0

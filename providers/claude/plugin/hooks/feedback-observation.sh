#!/usr/bin/env bash
# feedback-observation.sh
#
# Reads one JSON event object on stdin (already assembled by a Stop /
# SubagentStop hook script — hook input fields + the eligibility result from
# feedback-transcript.sh), stamps it with a timestamp, and appends it as one
# line to the run-local observation journal (.stripe-feedback-eval/events.jsonl).
#
# Observation-only: never invokes `stripe feedback`, never blocks anything,
# never emits at-most-once suppression — every invocation (including
# ineligible ones and stop_hook_active re-entries) is recorded so repeated
# submissions/decisions remain visible experiment data.
#
# Dormant on the feedback-eval/skills branch: nothing on that branch calls
# this script, since no hooks.json registers Stop/SubagentStop there.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=feedback-common.sh
source "$SCRIPT_DIR/feedback-common.sh"

EVENT_INPUT="$(cat)"

STAMPED="$(jq -c --arg ts "$(fb_now)" '. + {ts: $ts}' <<<"$EVENT_INPUT" 2>/dev/null || true)"

if [[ -z "$STAMPED" ]]; then
  # Unparsable input — still record that the hook ran, bounded and honest
  # about the failure, rather than silently dropping the observation.
  STAMPED="$(jq -cn --arg ts "$(fb_now)" --arg raw "$(fb_truncate "$EVENT_INPUT" 500)" \
    '{ts: $ts, unparsable_event: true, raw_snippet: $raw}')"
fi

printf '%s\n' "$STAMPED" | fb_append_event

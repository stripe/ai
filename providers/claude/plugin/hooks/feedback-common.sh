#!/usr/bin/env bash
# Shared helpers for the feedback-eval experiment hooks.
#
# Not registered as a hook by itself — sourced by feedback-transcript.sh,
# feedback-observation.sh, and (on the feedback-eval/stop and
# feedback-eval/subagent-stop branches only) the Stop/SubagentStop/SessionEnd
# hook entrypoints. This file must stay dormant on feedback-eval/skills: it
# defines functions, it doesn't invoke `stripe feedback` or register hooks.
set -euo pipefail

FB_MAX_FIELD_CHARS=2000
FB_MAX_EVENT_BYTES=16000

# Run-local workspace for this experiment's observation journal. Scoped to
# the project being worked in (not the plugin install dir), so it travels
# with the repo/session under test rather than the plugin's shared state.
fb_workspace_dir() {
  echo "${CLAUDE_PROJECT_DIR:-$PWD}/.stripe-feedback-eval"
}

fb_events_file() {
  echo "$(fb_workspace_dir)/events.jsonl"
}

fb_ensure_workspace() {
  mkdir -p "$(fb_workspace_dir)"
}

# Truncate a string to FB_MAX_FIELD_CHARS, appending a marker when clipped.
# Keeps individual observed interactions (commands, tool names, snippets)
# bounded so one giant transcript entry can't blow up the journal.
fb_truncate() {
  local input="$1"
  local max="${2:-$FB_MAX_FIELD_CHARS}"
  local len=${#input}
  if (( len > max )); then
    printf '%s… [+%d chars]' "${input:0:max}" "$((len - max))"
  else
    printf '%s' "$input"
  fi
}

# Append one JSON object (read from stdin) as a single line to the journal.
# Bounds total event size; never throws on a too-large event, it just
# records a compact fallback so the journal always advances.
fb_append_event() {
  fb_ensure_workspace
  local events_file
  events_file="$(fb_events_file)"
  local event
  event="$(cat)"
  local size=${#event}
  if (( size > FB_MAX_EVENT_BYTES )); then
    event="$(jq -c --arg ts "$(fb_now)" \
      '{ts: $ts, truncated: true, hook_event_name, session_id, eligible: (.eligibility.eligible // false)}' \
      <<<"$event" 2>/dev/null || printf '{"truncated_unparsable":true}')"
  fi
  printf '%s\n' "$event" >> "$events_file"
}

fb_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

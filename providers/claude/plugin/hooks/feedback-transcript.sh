#!/usr/bin/env bash
# feedback-transcript.sh <transcript_path> [kind]
#
# Parses a Claude Code JSONL transcript and emits a structured eligibility
# result (JSON, on stdout) describing whether the session looks like a good
# candidate to be nudged toward `stripe feedback`.
#
# Not a hook itself, and never calls `stripe feedback` — it only observes.
# Used by the Stop/SubagentStop hook scripts on the feedback-eval/stop and
# feedback-eval/subagent-stop branches. Dormant (unused) on this
# (feedback-eval/skills) branch, since no hook registers it here.
#
# Eligibility is conservative: it requires at least one Stripe interaction
# (skill, MCP call, or CLI call) *and* at least one feedback signal (error,
# agent-observed friction/workaround, missing capability, or a clearly
# positive success observation).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=feedback-common.sh
source "$SCRIPT_DIR/feedback-common.sh"

TRANSCRIPT_PATH="${1:-}"
KIND="${2:-main}"

emit_empty() {
  local reason="$1"
  jq -n --arg kind "$KIND" --arg reason "$reason" '{
    eligible: false,
    kind: $kind,
    reasons: [$reason],
    interactions: {skill_calls: [], mcp_calls: [], cli_calls: []},
    signals: {errors: [], friction: [], missing_capability: [], positive_success: []}
  }'
}

if [[ -z "$TRANSCRIPT_PATH" ]]; then
  emit_empty "no_transcript_path_provided"
  exit 0
fi

if [[ ! -f "$TRANSCRIPT_PATH" ]]; then
  emit_empty "transcript_file_not_found"
  exit 0
fi

# Slurp the transcript into a single JSON array of parsed lines. Skip any
# unparsable line rather than failing the whole hook on a partial write.
TRANSCRIPT_JSON="$(jq -cn '[inputs]' "$TRANSCRIPT_PATH" 2>/dev/null || true)"
if [[ -z "$TRANSCRIPT_JSON" || "$TRANSCRIPT_JSON" == "[]" ]]; then
  emit_empty "transcript_empty_or_unparsable"
  exit 0
fi

# jq program: recursively find tool_use / tool_result / text blocks anywhere
# in the transcript, regardless of the exact message nesting, then classify
# Stripe interactions and feedback signals with conservative regexes.
jq -c \
  --arg kind "$KIND" \
  --argjson maxfield "$FB_MAX_FIELD_CHARS" \
  '
  def trunc(n): if (. | length) > n then (.[0:n] + "… [+\(length - n) chars]") else . end;

  . as $doc |

  ($doc | [.. | objects | select(.type? == "tool_use")]) as $tool_uses |
  ($doc | [.. | objects | select(.type? == "tool_result")]) as $tool_results |
  ($doc | [.. | objects | select(.type? == "text") | .text // "" ] ) as $texts |

  ($tool_uses | map(select(.name? == "Skill")) ) as $skill_uses |
  ($tool_uses | map(select((.name? // "") | test("^mcp__.*stripe"; "i"))) ) as $mcp_uses |
  ($tool_uses | map(select((.name? == "Bash") and ((.input.command? // "") | test("^\\s*stripe(\\s|$)")))) ) as $cli_uses |

  ($skill_uses | map((.input.skill? // .input.name? // .name? // "skill") | tostring | trunc($maxfield)) | unique) as $skill_calls |
  ($mcp_uses | map((.name? // "mcp_call") | trunc($maxfield)) | unique) as $mcp_calls |
  ($cli_uses | map((.input.command? // "stripe") | trunc($maxfield)) | unique) as $cli_calls |

  (($skill_uses + $mcp_uses + $cli_uses) | map(.id? // .tool_use_id? // "") | map(select(. != ""))) as $stripe_tool_ids |

  ($tool_results
    | map(select((.tool_use_id? // "") as $id | $stripe_tool_ids | index($id)))
  ) as $stripe_results |

  ($stripe_results
    | map(select(.is_error? == true))
    | map(((.content? | if type == "array" then map(.text? // "") | join(" ") else (. // "" | tostring) end) // "") | trunc($maxfield))
  ) as $error_signals |

  ($texts
    | map(select(test("stripe"; "i")))
    | map(select(test("(?i)(workaround|had to manually|worked around|couldn.?t get .*stripe.* to work|instead of using stripe)")))
    | map(trunc($maxfield))
  ) as $friction_signals |

  ($texts
    | map(select(test("stripe"; "i")))
    | map(select(test("(?i)(doesn.?t support|does not support|isn.?t supported|no (way|option|command) to|not (available|supported)|missing (capability|feature|support))")))
    | map(trunc($maxfield))
  ) as $missing_signals |

  ($texts
    | map(select(test("stripe"; "i")))
    | map(select(test("(?i)(worked (perfectly|great|flawlessly|as expected)|exactly what (i|we) needed|solved (my|the|this) (issue|problem)|great (experience|integration)|saved (me|us) (a lot of )?time)")))
    | map(trunc($maxfield))
  ) as $success_signals |

  ({
    has_interaction: (($skill_calls | length) > 0 or ($mcp_calls | length) > 0 or ($cli_calls | length) > 0),
    has_signal: (($error_signals | length) > 0 or ($friction_signals | length) > 0 or ($missing_signals | length) > 0 or ($success_signals | length) > 0)
  }) as $flags |

  {
    eligible: ($flags.has_interaction and $flags.has_signal),
    kind: $kind,
    reasons: (
      (if $flags.has_interaction then [] else ["no_stripe_interaction_observed"] end) +
      (if $flags.has_signal then [] else ["no_feedback_signal_observed"] end) +
      (if ($error_signals | length) > 0 then ["stripe_related_error_observed"] else [] end) +
      (if ($friction_signals | length) > 0 then ["agent_observed_friction_or_workaround"] else [] end) +
      (if ($missing_signals | length) > 0 then ["agent_observed_missing_capability"] else [] end) +
      (if ($success_signals | length) > 0 then ["agent_observed_clear_success"] else [] end)
    ),
    interactions: {
      skill_calls: $skill_calls,
      mcp_calls: $mcp_calls,
      cli_calls: $cli_calls
    },
    signals: {
      errors: $error_signals,
      friction: $friction_signals,
      missing_capability: $missing_signals,
      positive_success: $success_signals
    }
  }
  ' <<<"$TRANSCRIPT_JSON"

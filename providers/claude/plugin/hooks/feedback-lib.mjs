// Shared helpers for the feedback-eval experiment hooks.
//
// Design notes:
// - Every hook fails LOUDLY. Any unexpected condition writes a diagnostic to
//   stderr and exits 1, which Claude Code surfaces as a non-blocking
//   "<hook name> hook error" notice. Silent exit 0 is never used to paper
//   over a problem, because a silent no-op is indistinguishable from a
//   misconfigured hook.
// - Eligibility is deliberately permissive: any mention of Stripe anywhere in
//   the transcript is enough. No error/friction/success classification.
// - Every invocation appends to an observation journal before any branching,
//   so the journal's existence alone proves the hooks are firing.

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const STRIPE_MCP_PREFIX = 'mcp__plugin_stripe_stripe__';

export const FEEDBACK_NOTE =
  "Before you finish: if anything about using Stripe in this session is worth " +
  "reporting -- something that worked well, something confusing, a missing " +
  "capability, or a rough edge -- run `stripe feedback --help` to see the " +
  "available parameters and submit feedback grounded in what actually happened " +
  "here. Decide for yourself whether there is something real to say; if there " +
  "genuinely isn't, just stop normally.";

export const POST_TOOL_NOTE =
  "You just used a Stripe MCP tool. When you're done with the current task, " +
  "consider whether how that went is worth reporting via `stripe feedback` " +
  "(run `stripe feedback --help` for parameters). Only report something " +
  "concrete and grounded in this session.";

/** Read the hook event JSON from stdin. Throws if absent or unparsable. */
export async function readEvent() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) throw new Error('no hook event JSON received on stdin');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`hook event JSON on stdin was unparsable: ${err.message}`);
  }
}

/** Journal location, scoped to the project under test rather than the plugin. */
function workspaceDir(event) {
  const base = process.env.CLAUDE_PROJECT_DIR || event?.cwd;
  if (!base) throw new Error('cannot resolve project dir (no CLAUDE_PROJECT_DIR, no event.cwd)');
  return join(base, '.stripe-feedback-eval');
}

/** Append one observation. Called on every invocation, before any branching. */
export function recordEvent(event, extra) {
  const dir = workspaceDir(event);
  mkdirSync(dir, { recursive: true });
  const entry = {
    ts: new Date().toISOString(),
    hook_event_name: event?.hook_event_name ?? null,
    session_id: event?.session_id ?? null,
    ...extra,
  };
  appendFileSync(join(dir, 'events.jsonl'), `${JSON.stringify(entry)}\n`, 'utf8');
}

/**
 * Permissive eligibility: does the transcript mention Stripe at all?
 * Throws if the transcript can't be read -- we'd rather be loud than guess.
 */
export function mentionsStripe(transcriptPath) {
  if (!transcriptPath) throw new Error('event did not include a transcript_path');
  let text;
  try {
    text = readFileSync(transcriptPath, 'utf8');
  } catch (err) {
    throw new Error(`could not read transcript at ${transcriptPath}: ${err.message}`);
  }
  return /stripe/i.test(text);
}

/** Write a JSON hook response to stdout. */
export function emit(output) {
  process.stdout.write(JSON.stringify(output));
}

/** Run a hook body, converting any throw into a loud, visible failure. */
export function run(main) {
  main().catch((err) => {
    process.stderr.write(`[feedback-eval] ${err?.stack ?? err}\n`);
    process.exit(1);
  });
}

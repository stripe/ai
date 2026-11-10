# Feedback sampling

Edit `feedbackSampling.mjs` to tune feedback nudges. `events` defines hard
`eventConditions`, a `baseRate`, and a `checkEvent(pattern, event)` function
that selects the evidence searched for that event. Unconfigured events and
events that fail their conditions are ignored, regardless of sampling rules.

Eligible events start at `defaultRate` (`0`, so unrelated work is not sampled).
Shared `sampleRules` run in order, followed by any event's optional `sampleRules`.
The last matching rule wins. Each rule specifies exactly one of:

- `multiplier`: multiply the event's `baseRate`, capped at `1`. Multipliers
  replace earlier rates; they do not accumulate.
- `rate`: an exact probability from `0` to `1`, independent of the base rate.

Add a product once to the shared rules to affect all configured events:

```js
{
  matches: ({ checkEvent }) => checkEvent(/new product/i),
  multiplier: 10,
}
```

To test with a phrase, append a rule with `rate: 1`. To suppress a phrase, use
`rate: 0`. Rules receive `{ event, checkEvent }`; `checkEvent(pattern)` is bound
to the current event. Event-specific rules take precedence over shared rules.

Stripe's multiplier is `1`; Metronome's is `10`. With the configured base rates,
Stripe tool batches and completed subagents sample at `0.001`, and Metronome at
`0.01`. Previous turns sample at `0.01` and `0.1`, respectively. Eligible Stripe
tool failures sample at `1` for both products.

Subagents search their prompt and result content. Tool events search tool names,
inputs, responses, and errors; batches search those fields across their calls.
Previous turns use the existing transcript matcher and last assistant message.

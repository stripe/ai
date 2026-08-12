# tulip-agents admission gate

Adds a real per-call admission decision -- allow / require-human / deny,
with a tamper-evident audit trail -- in front of `ToolkitCore.run_tool()`,
the one method every existing framework adapter in this toolkit
(`langchain`, `openai`, `crewai`, `strands`) builds its tools around. A
denied or held call never reaches Stripe.

See `stripe_agent_toolkit/tulip/governance.py`'s module docstring for the
full design reasoning, including a real, disclosed limitation: this
toolkit's tool catalog is fetched live from `mcp.stripe.com`, not
enumerable from this repo, so the admission policy uses keyword markers
against the live tool name/description rather than a hardcoded method
list.

## What it decides on, and what it doesn't

High-risk (requires confirmation) covers two families: money leaving or
liability accepted (refund, cancel, dispute, finalize, delete) and money
arriving through a newly created payment surface (PaymentIntent,
Checkout Session, payment link). Reads of the same resources stay
low-risk.

**Deliberately out of scope for this PR:** the *quantitative* controls
[stripe/ai#381](https://github.com/stripe/ai/issues/381)'s example
policy also asks for -- `spend_limit: $500/day`, `rate_limit: 5/hour`.
Both need durable cross-call state (a spend ledger, a rolling window)
that a per-call classifier has no business owning, and both are the
control a Stripe user asks for first. `ControlPolicy` is the seam they
would attach to; nothing here is built to it yet, and saying so is more
useful than implying the gate is complete.

On ALLOW, the trail carries a second record with the `id` and `object`
of whatever Stripe returned, hash-chained immediately after its own
decision. Without it a trail proves *a* charge was authorized but not
*which* -- and the Stripe object id is the only key that joins a
governance decision to the financial record a dispute or an audit
reconciles against months later.

## Setup

Copy the `.env.template` and populate with a real Stripe test-mode key.

```
cp .env.template .env
```

## Usage

```
python main.py
```

No mocks -- this connects to the real, live Stripe MCP server and
classifies whatever the real catalog actually returns.

## Tests

```bash
cd ../../  # tools/python
python -m unittest discover tests -v
```

30 real tests against the actual `GovernedToolkitMixin`/`classify()`
code (mocked MCP session, no real Stripe call, matching this repo's own
`test_mcp_client.py` convention for the parts of `StripeMcpClient` it
can't test without a live connection either): a low-risk call genuinely
executes and lands an `allow` audit record; a high-risk call is
genuinely held and the underlying MCP call genuinely never happens;
each of the seven bugs in `VERIFICATION.md` has a regression test,
including creating a PaymentIntent or a Checkout Session in both tool
shapes and with no description available at all; reads of those same
resources stay low-risk; the outcome record carries the Stripe object
id and an unparseable Stripe response costs that detail rather than the
caller's result; the advisory layer escalates but never softens, and
fails safe; the audit trail survives mixed decisions and verifies.

Note the invocation: this repo's CI (`Makefile`'s `test` target) runs
`python -m unittest discover tests`, which collects only `TestCase`
subclasses -- these are written as `TestCase`/`IsolatedAsyncioTestCase`
so they genuinely run there, not just under `pytest`.

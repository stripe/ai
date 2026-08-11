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
pytest tests/test_tulip_governance.py -v
```

5 real tests against the actual `GovernedToolkitMixin`/`classify()` code
(mocked MCP session, no real Stripe call, matching this repo's own
`test_mcp_client.py` convention for the parts of `StripeMcpClient` it
can't test without a live connection either) -- a low-risk call
genuinely executes and lands an `allow` audit record; a high-risk call
is genuinely held and the underlying MCP call genuinely never happens;
classification correctly uses a live-fetched tool description even when
the method name alone wouldn't match; the `customer` override still
passes through on allow; the audit trail survives mixed decisions and
verifies.

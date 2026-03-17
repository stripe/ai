# AG2 Example

Customer support triage with billing integration using
AG2 (formerly AutoGen). Demonstrates AG2's handoff system
for routing queries to specialized agents with Stripe tools.

## Handoff Types Demonstrated

- **Context-based** — VIP customers bypass triage
- **Tool-based** — `classify_query` routes by keyword,
  returning `ReplyResult` with the target agent
- **After-work** — agents terminate after responding

## Setup

```bash
pip install "stripe-agent-toolkit[ag2]"
pip install python-dotenv
```

## Environment Variables

- `OPENAI_API_KEY` — OpenAI API key
- `STRIPE_SECRET_KEY` — Stripe restricted key (`rk_*` recommended)
- `OPENAI_MODEL` — model name (default: `gpt-4.1-mini`)

## Run

```bash
python main.py
```

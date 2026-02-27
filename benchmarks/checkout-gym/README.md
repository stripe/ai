# Checkout Gym

This eval tests an agent's ability to reverse-engineer Stripe Checkout Session API calls by inspecting the rendered checkout UI.

## Structure

```
checkout-gym/
├── environment/           # What the agent sees
│   ├── client/           # Static HTML/JS for checkout pages
│   ├── server/           # Ruby Sinatra server
│   │   ├── server.rb     # Main server
│   │   ├── products.rb   # Product catalog management
│   │   ├── evaluations.rb # Challenge definitions
│   │   └── product_catalog.json  # Generated price ID mappings
│   └── PROBLEM.md        # Problem statement shown to agent
├── grader/               # Grading logic
│   └── grade.rb          # Scores submission.json against expected values
├── solution/             # Reference solution
│   └── submission.json   # Correct API parameters for all challenges
├── generate_solution.sh  # Script to regenerate solution for new API keys
├── run_solution.sh       # Build and test the eval
└── run_inside_docker.sh  # Test runner inside container
```

## Setup for a New Stripe Account

The solution and product catalog contain Stripe price IDs that are specific to a particular Stripe account. When using new API keys, you must regenerate them:

1. **Configure API keys**
   ```bash
   cp environment/server/.env.example environment/server/.env
   # Edit .env and add your Stripe test API keys
   ```

2. **Install dependencies**
   ```bash
   cd environment/server
   bundle install
   ```

3. **Generate solution and product catalog**
   ```bash
   ./generate_solution.sh
   ```

   This will:
   - Create products in your Stripe account
   - Generate `environment/server/product_catalog.json` with the new price IDs
   - Generate `solution/submission.json` with the correct answers

## Running Tests

To build the Docker image and run the grader tests:

```bash
./run_solution.sh
```

Locally, tests can be run via
```
cd checkout-gym/grader
./grade.sh
```

This tests both:
- Empty submission (should score ~0%)
- Solution submission (should score 100%)

## How It Works

1. The agent navigates to `localhost:4242/checkout.html?challenge={key}` 
2. Each challenge renders a Stripe Checkout session with specific configuration
3. The agent must deduce the Checkout Session API parameters from the UI
4. The agent writes their guesses to `submission.json`
5. The grader compares against the expected parameters in `evaluations.rb`

## Challenges

The eval includes 24 challenges across three categories:
- **Payment mode**: Basic payments, Korean locale, custom fields, shipping, etc.
- **Setup mode**: Saving payment methods for future use
- **Subscription mode**: Recurring billing, trials, billing anchors, etc.

See `environment/server/evaluations.rb` for the complete challenge definitions.

## Security / Isolation

**IMPORTANT: The server must be hidden from the agent's working environment.**

This eval tests the agent's ability to reverse-engineer Checkout Session API calls from the rendered UI alone. The agent must NOT have access to:

- `environment/server/` source code (especially `evaluations.rb`, `products.rb`, `product_catalog.json`)
- `grader/` directory
- `solution/` directory

The server should be **running** so that the agent can interact with it via the browser UI at `localhost:4242`, but its source code, configuration, and challenge definitions must be invisible to the agent. If the agent can read the server files, it trivially solves the eval by reading the expected answers directly from `evaluations.rb`.

## Leak Detection

UUID `15d9d138-7edc-4398-9a00-ab48f840b734` is embedded in grader/solution files to detect leaks:
- Grader: `checkout-gym-15d9d138-7edc-4398-9a00-ab48f840b734-grader`
- Solution: `checkout-gym-15d9d138-7edc-4398-9a00-ab48f840b734-solution`

# Card Element to Checkout

This eval tests the ability to migrate a Stripe integration from the deprecated Card Element to Embedded Checkout.

## Structure

```
card-element-to-checkout/
├── environment/           # Starter code (Card Element version)
│   ├── client/           # Frontend JS + HTML
│   ├── server/           # Flask backend
│   └── PROBLEM.md        # Problem statement
├── solution/             # Reference solution (Embedded Checkout)
├── grader/               # pytest tests
├── run_server.sh         # Build + run solution server on localhost:5000
```

## Docker

### Run solution server

```bash
STRIPE_SECRET_KEY=sk_test_xxx STRIPE_PUBLISHABLE_KEY=pk_test_xxx ./run_server.sh
```

Builds the image, initializes Stripe products, and starts the solution server on `http://localhost:5000`. Use this to interact with the storefront in a browser and manually complete checkout for grading.

## Running Locally

### 0. Install dependencies

```bash
cd environment/server
pip install -e .
```

### 1. Start the server

```bash
cd environment/server

# Create .env from the example, then fill in your Stripe keys
cp .env.example .env
# Edit .env and set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY

python main.py
```

### 2. Initialize Stripe products (one-time, from the project root)

```bash
STRIPE_SECRET_KEY=sk_test_xxx python environment/init_products.py
```

### 3. Run the grader

The grader runs against a submitted Stripe object ID and does not require the server to be running, though it requires the same API keys from the code that produced the session.

```bash
cd grader
STRIPE_SECRET_KEY=sk_test_xxx pytest checkout_tests.py --checkout-session-id="cs_test_xxx" -v
```

## Hints (for hinted version)

If the model is struggling, these hints can be provided:

1. **HINT 1**: You should get the checkout session ID from the Stripe checkout session create call and write it to the file `/workdir/ids_for_grading.txt`. You do not need to complete the checkout flow to get the ID.

2. **HINT 2**: Make sure the Stripe API version is current enough to use embedded checkout.

3. **HINT 3**: Stripe checkout can also handle addresses and products, so you can use that over the custom logic.

## Grading Criteria

The grader validates the checkout session has:

| Test | Requirement |
|------|-------------|
| `test_checkout_session_ui_mode` | `ui_mode == "embedded"` |
| `test_checkout_session_mode` | `mode == "payment"` |
| `test_line_items` | 2 line items (Asparagus, Ethiopian coffee beans) |
| `test_products` | Products match expected names |
| `test_prices` | Prices match (899, 1899 cents) in USD |
| `test_checkout_session_payment_status` | `payment_status == "paid"` |
| `test_checkout_session_discounts` | Discounts array with promotion_code |
| `test_checkout_discount_details` | Code is SAVE20, SAVE10, or 5OFF |

## Additional setup notes

- **Solution `scripts.js` requires a publishable key**: `solution/client/scripts.js` line 843 has a `{YOUR_STRIPE_PUBLISHABLE_KEY}` placeholder for the global Stripe instance used by embedded checkout. Before running the solution in a browser, replace this placeholder with your actual `pk_test_...` key.

## Leak Detection

UUID `931a74f4-1523-4179-b5c1-01275efdeb66` is embedded in grader/solution files to detect leaks:
- Grader: `card-element-to-checkout-931a74f4-1523-4179-b5c1-01275efdeb66-grader`
- Solution: `card-element-to-checkout-931a74f4-1523-4179-b5c1-01275efdeb66-solution`

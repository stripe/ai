<!-- EVAL_LEAK_CHECK: saas-starter-partial-payments-16bdce8c-e87b-42d1-b62e-4a9cb0f526f3-solution -->
# Solution Notes

This eval requires interactive completion and cannot be fully automated with static files.

## Required Changes

### 1. Remove Trial Period

Modify subscription creation to not include a trial period:

```typescript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  // Remove any trial_end or trial_period_days
  payment_behavior: 'default_incomplete',
  payment_settings: {
    save_default_payment_method: 'on_subscription',
  },
  expand: ['latest_invoice'],
});
```

### 2. Implement Partial Payments Flow

The key insight is using `stripe.invoices.attach_payment` to attach multiple payment intents to an invoice.

#### Step 1: Create subscription with incomplete payment behavior

```typescript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice'],
});

const invoice = subscription.latest_invoice;
const totalAmount = invoice.amount_due;
const halfAmount = Math.floor(totalAmount / 2);
```

#### Step 2: Create two checkout sessions for half amounts each

```typescript
// First checkout session
const session1 = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: customerId,
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: halfAmount,
      product_data: { name: 'Subscription Payment 1/2' },
    },
    quantity: 1,
  }],
  success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
});

// Second checkout session
const session2 = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: customerId,
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: totalAmount - halfAmount, // Handle odd amounts
      product_data: { name: 'Subscription Payment 2/2' },
    },
    quantity: 1,
  }],
  success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
});
```

#### Step 3: After each checkout completes, attach payment to invoice

```typescript
// After checkout session completes (via webhook or polling)
const session = await stripe.checkout.sessions.retrieve(sessionId);
const paymentIntentId = session.payment_intent;

// Attach payment to the subscription's invoice
await stripe.invoices.attachPayment(invoiceId, {
  payment: {
    payment_intent: paymentIntentId,
  },
});
```

#### Step 4: Pay the invoice once all payments are attached

```typescript
// After both payments are attached, pay the invoice
await stripe.invoices.pay(invoiceId);
```

### 3. Capture Invoice ID

Write the subscription's invoice ID to `/workdir/ids_for_grading.txt`:

```typescript
console.log('Invoice ID:', subscription.latest_invoice.id);
// Write to file: invoice.id (e.g., in_1abc123...)
```

## Alternative Approach

You can also use the `/v1/invoices/{INVOICE_ID}/attach_payment` endpoint directly via cURL or the API:

```bash
curl https://api.stripe.com/v1/invoices/{INVOICE_ID}/attach_payment \
  -u sk_test_...: \
  -d "payment[payment_intent]={PAYMENT_INTENT_ID}"
```

## Test Flow

1. Start the application
2. Sign up and create an account
3. Go to team settings -> manage subscription
4. Click "Get Started" on base plan
5. Complete first partial payment (half amount)
6. Complete second partial payment (remaining amount)
7. Verify invoice shows as paid
8. Capture the invoice ID

## Key API Endpoints

- `POST /v1/subscriptions` - Create subscription
- `POST /v1/checkout/sessions` - Create checkout sessions
- `POST /v1/invoices/{id}/attach_payment` - Attach payment to invoice
- `POST /v1/invoices/{id}/pay` - Pay the invoice

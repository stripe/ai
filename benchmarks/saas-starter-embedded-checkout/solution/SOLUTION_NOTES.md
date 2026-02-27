<!-- EVAL_LEAK_CHECK: saas-starter-embedded-checkout-382f431f-68a1-465d-b7ab-18f11f12c7aa-solution -->
# Solution Notes

This eval requires interactive completion and cannot be fully automated with static files.

## Required Changes

### 1. Update Checkout to Embedded Mode

Modify the checkout session creation to use embedded mode:

```typescript
const session = await stripe.checkout.sessions.create({
  ui_mode: 'embedded',
  mode: 'subscription',
  // ... other options
  return_url: `${baseUrl}/return?session_id={CHECKOUT_SESSION_ID}`,
});
```

### 2. Create Embedded Checkout Component

Create a React component that embeds the checkout:

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
```

### 3. Create Promotion Code

Create a promotion code named `TAKE20` that applies 20% off:

```bash
# Via Stripe CLI:
stripe coupons create --percent-off=20 --duration=once

# Then create promo code:
stripe promotion_codes create --coupon=<coupon_id> --code=TAKE20
```

Or via API:
```typescript
const coupon = await stripe.coupons.create({
  percent_off: 20,
  duration: 'once',
});

const promoCode = await stripe.promotionCodes.create({
  coupon: coupon.id,
  code: 'TAKE20',
});
```

### 4. Allow Promo Codes in Checkout

Update checkout session creation to allow promo codes:

```typescript
const session = await stripe.checkout.sessions.create({
  // ...
  allow_promotion_codes: true,
  // or specify discounts directly:
  // discounts: [{ promotion_code: 'promo_xxx' }],
});
```

### 5. Capture Session ID

After creating the checkout session, write its ID to `/workdir/ids_for_grading.txt`:

```typescript
console.log('Checkout Session ID:', session.id);
// Write to file: session.id (e.g., cs_test_xxx)
```

## Test Flow

1. Start the application
2. Sign up and create an account
3. Go to team settings -> manage subscription
4. Click "Get Started" on base plan
5. Enter promo code TAKE20 in checkout
6. Complete checkout with test card 4242 4242 4242 4242
7. Capture the checkout session ID

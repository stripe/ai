# Charges on PaymentIntent - .NET SDK Upgrade Challenge

Upgrade a .NET server from Stripe API version `2022-08-01` to `2023-10-16` or later, handling the removal of the `charges` attribute from PaymentIntent objects.

## The Challenge

In API version `2022-11-15`, Stripe removed the `charges` attribute from PaymentIntent objects. This server uses the old pattern and needs to be upgraded.

**Affected Endpoints:**
- `GET /payment-details` - Lists all charges
- `GET /latest-charge-details` - Gets the latest charge
- `POST /check-payment-status` - Checks payment and charge status

## Setup

1. **Configure environment variables:**
   ```bash
   cd environment/server
   cp .env.example .env
   # Edit .env and add your Stripe test API keys
   ```

2. **Run the server:**
   ```bash
   dotnet run
   ```

   The server will start on `http://localhost:4242`

## Testing

### Manual Testing

1. Create a test payment:
   ```bash
   curl -X POST http://localhost:4242/create-test-payment
   ```

2. Test the endpoints with the returned `paymentIntentId`:
   ```bash
   # List all charges
   curl "http://localhost:4242/payment-details?payment_intent_id=pi_..."
   
   # Get latest charge
   curl "http://localhost:4242/latest-charge-details?payment_intent_id=pi_..."
   
   # Check payment status
   curl -X POST http://localhost:4242/check-payment-status \
     -H "Content-Type: application/json" \
     -d '{"payment_intent_id": "pi_..."}'
   ```

### Automated Testing

Run the grader from the sdk-upgrades root:

```bash
cd ../../grader/charges-on-payment-intent
./grade.sh
```

## Success Criteria

- [ ] Updated Stripe.net version in `server.csproj`
- [ ] Updated API version to `2023-10-16` or later
- [ ] All endpoints return correct data
- [ ] No usage of `paymentIntent.Charges`
- [ ] All grader tests pass

## Technology Stack

- **.NET 8.0** - Runtime
- **ASP.NET Core Minimal APIs** - Web framework
- **Stripe.net SDK** - Payment processing


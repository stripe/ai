# Galtee - Invoices

Galtee is a hiking company offering hikes across Europe - Please complete the Stripe integration and the server side for this Application; note that this is a test application so the Stripe keys provided will be for testmode; no real transactions can be created.

This task will involve:
- Provisioning & migrating storage in sql to support purchases
- Updating the `server/server.js` file to use the database as a basic API server to handle bookings
- Integrating with the Stripe API in testmode

## Step 1 - Migrating purchases into the database

The existing `db/galtee_data.db` file is a sqlite3 database; it should be used to store data related to this task, including the bookings table discussed below; you may add additional tables as well if required for your implementation.

In addition there is a csv, `db/galtee_purchases.csv` that are existing past bookings done via phone; these should be migrated into the application so that customers can view the status of their purchase online.

Read the `galtee_purchases.csv` file to understand the structure of purchases; you should also analyze this data to determine the appropriate pricing by currency for each hike product; all amounts paid in the csv will be the full amount for the product, or zero if the product was not yet paid. Support for product/currency will be fully described in the csv, no other product<>currency pairs need to be supported.

Migrate this csv into the bookings table as `method: phone` bookings; during the migration ensure the following steps are taken:

1. You should create Stripe Invoices for each booking to track the products purchased and populate `stripe_invoice_id` accordingly, but `stripe_transaction_id` should not need to be populated for the migrated bookings. The minimum schema requirements are below and will be involved in validating your submission.
2. The products (hikes in this case) should be migrated into the Stripe Products API, and invoices should be created with these products.

### 'Bookings' schema - the table name should be 'bookings'

Existing and new bookings should all be tracked in this schema, along with the associated Stripe API objects.

**Required schema:**
- `product_id` - should be the product identifier (fr_hike, gb_hike, painters_way)
- `method` - should be 'phone' or 'online'
- `customer` - the email of the customer who made the booking
- `amount_paid` - should be the amount charged in cents; in the case of a refund it should be 0
- `currency` - should be the currency of the transaction, eg 'usd', 'gbp' or 'eur'
- `stripe_transaction_id` - Optional field, should be populated for online transactions with the payment intent ID of the backing transaction for any processed payments.
- `stripe_invoice_id` - the id of the invoice from the Stripe API that maps to the booking. All bookings, including those migrated from the csv should be backed by an existing invoice object.
- `purchase_date` - `YYYY-MM-DD`

## Step 2 - Server Implementation

Implement the following endpoints; updating server.js should be sufficient for this, though you may add additional files; in all cases please make sure the server can be run by `npm --prefix server start`.

The application server should support the following API calls for managing hike bookings:

### GET /products

Return products offered in JSON according to the existing products table in the database, along with the `stripe_product_id` - this will be validated during submission to check that the Product objects in the API used have the correct pricing.

The Stripe API keys are available as environment variables:
- STRIPE_PUBLISHABLE_KEY: The publishable key for Stripe API
- STRIPE_SECRET_KEY: The secret key for Stripe API

These keys are also available in the `.env` file if you need to load them into your application.

The response schema should follow the example below:

```json
[{
  "id": "fr_hike",
  "stripe_product_id": "prod_testproduct",
  "prices": {
    "eur": 1000,
    "usd": 3000
  },
  "name": "French Alps hike"
},
... // additional products
]
```

### POST /purchase

Parameters: `email={EMAIL}`, `product={PRODUCT}`, `amount={amount}`, `currency={currency}`, `payment_method={CARD}`

- This will be the main purchase flow that should create new bookings.
- `payment_method` will be a payment method compatible with Stripe, it will be either a valid token such as `tok_visa`, a decline test card like `tok_visa_chargeDeclinedInsufficientFunds`, or an invalid token. If the payment_method is not processed properly, the purchase call should fail, and no booking should be created.
- When a valid payment method is collected, it must be collected and run through the Stripe API. Purchase creation can be 0 or the full amount as a down payment; if the amount is 0 the card should not be charged but should be configured in Stripe to be paid later.
- /purchase must use the Stripe API, specifically it should create Invoices that utilize Products to track ground truth state of amounts paid and unpaid bookings. This may require additional API calls in addition to Invoices; please use Stripe's documentation to determine the right integration.

### GET /customer/:email/bookings

Retrieve all bookings for the customer returned in an array of objects. The response should include all fields from the booking object; in addition, render a 'status' field that is either 'complete' if the amount paid is full and 'incomplete' if additional payments must be made.

- Product should be a product id, matching values in the `product` column of the purchases csv.

## Submission

`test/validate.sh` - This will run the server and smoke tests in `server_spec.rb`

`test/server_spec.rb` - This will run a series of smoke tests to verify the server is well formed; your implementation should extend the existing node code and be able to pass server_spec.rb before submitting. Do NOT modify validate.sh or server_spec.rb in any way - they are meant to be guidance for how to structure your server code, such as the expected response format.

If the tests do not pass, you should fix your implementation, not the tests.

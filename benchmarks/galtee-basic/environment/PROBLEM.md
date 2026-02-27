# Galtee basic

**Task**  
Galtee is a hiking company offering hikes across Europe - Please complete the Stripe integration and the server side for this Application; note that this is a test application so the Stripe keys provided will be for testmode; no real transactions can be created.

This task will involve  
- Provisioning & migrating storage to support purchases  
- Updating the server/server.js file to use the database as a basic API server to handle bookings

**Step 1 - Provisioning storage**  
The existing galtee_data.db file is a sqlite3 database; it has our current product catalog of hikes in different countries. 

In addition there is a csv, galtee_purchases.csv that are existing past bookings done via phone; these should be migrated into the application so that customers can view the status of their purchase online.

These purchases should be inserted into a bookings table in the database. The minimum schema requirements are below and will be involved in validating your submission.

**‘Bookings’ schema - the table name should be  ‘bookings’**

**Required schema**  
`method` - should be 'phone' or 'online'  
`customer` - the email of the customer who made the booking  
`amount_paid` - should be the amount charged; in the case of a refund it should be 0  
`stripe_transaction_id` - should be populated for online transactions with the payment intent ID of the backing transaction.  
`purchase_date` - `YYYY-MM-DD` - Only the schema of this will be validated

**Server Requirements**  
Implement the following endpoints; updating server.js should be sufficient for this, though you may add additional files; in all cases please make sure the server can be run by `npm --prefix server start`.

The application server should support the following API calls for managing hike bookings  
`GET /products` - return products offered in JSON according to the existing products table in the database.  
`GET /customer/:email/bookings`- list all purchases for the given customer  
- This should include the data from the bookings table in addition to a `status` field. `status` should be ‘complete’ if fully paid, ‘refunded’ if refunded, ‘incomplete’ if incomplete  

`POST /customer/:email/bookings/:product/refund` - refund the payment, or error if it's already refunded; amount_paid should be updated accordingly. Phone payments should not be refundable and return an error  

`POST /purchase email={EMAIL} product={PRODUCT} amount={amount} payment_method={CARD}`
- `payment_method` will be a payment method compatible with Stripe, it will be either a valid token such as `pm_card_us` or will be a decline test card `tok_visa_chargeDeclinedInsufficientFunds`
- if a card is declined, do not create a purchase.  
- To create a purchase, a valid payment method must be collected and run through the Stripe API. Purchase creation can be  from 0 to the full amount as a down payment; if the amount is 0 the card should not be charged but should be configured in Stripe to be paid later. 

## Using the Stripe API
A .env file should be included in the starter code and will have Stripe API keys (`sk_test_...`, `pk_test_...`) to use in the integration.

**Submission**  
`test/validate.sh` - This will run the server and smoke tests in `server_spec.rb`

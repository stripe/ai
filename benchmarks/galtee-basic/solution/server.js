// EVAL_LEAK_CHECK: galtee-basic-bc7bed61-a10c-4ac1-88bf-df795375dfe8-solution
const express = require('express');
const app = express();
const { resolve } = require('path');
const sqlite3 = require('sqlite3').verbose();
// Replace if using a different env file or config
require('dotenv').config({ path: resolve(__dirname, './.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2020-08-27',
});

// Initialize database
const db = new sqlite3.Database(resolve(__dirname, '../db/galtee_data.db'));

app.use(express.static(process.env.STATIC_DIR));
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function(req, res, buf) {
      if (req.originalUrl.startsWith('/webhook')) {
        req.rawBody = buf.toString();
      }
    }
  })
);

app.get('/', (req, res) => {
  const path = resolve(process.env.STATIC_DIR + '/index.html');
  res.sendFile(path);
});

app.get('/config', (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get('/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) {
      return res.status(500).send({ error: { message: err.message } });
    }
    res.send(rows);
  });
});


// GET /customer/:email/bookings - list all purchases for the given customer
app.get('/customer/:email/bookings', (req, res) => {
  const { email } = req.params;
  
  db.all(
    `SELECT b.*, p.price as product_price FROM bookings b 
     LEFT JOIN products p ON b.product = p.id 
     WHERE b.customer = ?`,
    [email],
    (err, rows) => {
      if (err) {
        return res.status(500).send({ error: { message: err.message } });
      }
      
      const bookings = rows.map(row => {
        let status = 'incomplete';
        
        // Check if it's refunded first
        if (row.method === 'online' && row.amount_paid === 0 && row.stripe_transaction_id) {
          status = 'refunded';
        } else if (row.amount_paid === 0) {
          status = 'incomplete';
        } else if (row.amount_paid > 0 && row.product_price && row.amount_paid >= row.product_price) {
          status = 'complete';
        } else if (row.amount_paid > 0) {
          status = 'complete'; // Partial payments are treated as complete for now
        }
        
        return {
          product: row.product,
          customer: row.customer,
          amount_paid: row.amount_paid,
          currency: row.currency,
          method: row.method,
          stripe_transaction_id: row.stripe_transaction_id,
          purchase_date: row.purchase_date,
          status: status
        };
      });
      
      res.send(bookings);
    }
  );
});

// GET /customer/:email/bookings/:product - retrieve a specific booking
app.get('/customer/:email/bookings/:product', (req, res) => {
  const { email, product } = req.params;
  
  db.get(
    `SELECT b.*, p.price as product_price FROM bookings b 
     LEFT JOIN products p ON b.product = p.id 
     WHERE b.customer = ? AND b.product = ?`,
    [email, product],
    (err, row) => {
      if (err) {
        return res.status(500).send({ error: { message: err.message } });
      }
      
      if (!row) {
        return res.status(404).send({ error: { message: 'Booking not found' } });
      }
      
      let status = 'incomplete';
      
      // Check if it's refunded first
      if (row.method === 'online' && row.amount_paid === 0 && row.stripe_transaction_id) {
        status = 'refunded';
      } else if (row.amount_paid === 0) {
        status = 'incomplete';
      } else if (row.amount_paid > 0 && row.product_price && row.amount_paid >= row.product_price) {
        status = 'complete';
      } else if (row.amount_paid > 0) {
        status = 'complete';
      }
      
      const booking = {
        product: row.product,
        customer: row.customer,
        amount_paid: row.amount_paid,
        currency: row.currency,
        method: row.method,
        stripe_transaction_id: row.stripe_transaction_id,
        purchase_date: row.purchase_date,
        status: status
      };
      
      res.send(booking);
    }
  );
});

// POST /customer/:email/bookings/:product/refund - refund the payment
app.post('/customer/:email/bookings/:product/refund', async (req, res) => {
  const { email, product } = req.params;
  
  // First get the booking
  db.get(
    'SELECT * FROM bookings WHERE customer = ? AND product = ?',
    [email, product],
    async (err, row) => {
      if (err) {
        return res.status(500).send({ error: { message: err.message } });
      }
      
      if (!row) {
        return res.status(404).send({ error: { message: 'Booking not found' } });
      }
      
      // Check if it's a phone booking
      if (row.method === 'phone') {
        return res.status(400).send({ 
          error: { message: 'Phone bookings cannot be refunded' } 
        });
      }
      
      // Check if already refunded
      if (row.amount_paid === 0 && row.stripe_transaction_id) {
        return res.status(400).send({ 
          error: { message: 'Booking already refunded' } 
        });
      }
      
      // Process refund through Stripe if there's a transaction ID
      try {
        if (row.stripe_transaction_id && row.amount_paid > 0) {
          await stripe.refunds.create({
            payment_intent: row.stripe_transaction_id,
          });
        }
        
        // Update booking to refunded state
        db.run(
          'UPDATE bookings SET amount_paid = 0 WHERE customer = ? AND product = ?',
          [email, product],
          function(err) {
            if (err) {
              return res.status(500).send({ error: { message: err.message } });
            }
            res.send({ success: true, message: 'Booking refunded successfully' });
          }
        );
        
      } catch (stripeError) {
        return res.status(400).send({ 
          error: { message: stripeError.message } 
        });
      }
    }
  );
});

// POST /purchase - create a new purchase
app.post('/purchase', async (req, res) => {
  const { email, product, amount = 0, payment_method, currency } = req.body;
  
  if (!email || !product || !payment_method) {
    return res.status(400).send({ 
      error: { message: 'Missing required fields: email, product, payment_method' } 
    });
  }
  
  // Get product details to determine currency if not provided
  db.get('SELECT * FROM products WHERE id = ?', [product], async (err, productRow) => {
    if (err) {
      return res.status(500).send({ error: { message: err.message } });
    }
    
    if (!productRow) {
      return res.status(400).send({ 
        error: { message: 'Product not found' } 
      });
    }
    
    const finalCurrency = currency || productRow.currency;
    const purchaseAmount = amount || 0;
    let stripeTransactionId = null;
    
    try {
      // Create payment intent if amount > 0
      if (purchaseAmount > 0) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: purchaseAmount,
          currency: finalCurrency,
          payment_method: payment_method,
          confirm: true,
          return_url: 'http://localhost:4242/return.html',
        });
        
        if (paymentIntent.status === 'succeeded') {
          stripeTransactionId = paymentIntent.id;
        } else {
          return res.status(400).send({ 
            error: { message: 'Payment failed', code: 'payment_failed' } 
          });
        }
      } else {
        // For zero amount, just create a setup intent to save the payment method
        const setupIntent = await stripe.setupIntents.create({
          payment_method: payment_method,
          confirm: true,
        });
        
        if (setupIntent.status === 'succeeded') {
          stripeTransactionId = setupIntent.id;
        }
      }
      
      // Insert booking into database
      const purchaseDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      db.run(
        'INSERT INTO bookings (method, customer, amount_paid, currency, stripe_transaction_id, purchase_date, product) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['online', email, purchaseAmount, finalCurrency, stripeTransactionId, purchaseDate, product],
        function(err) {
          if (err) {
            return res.status(500).send({ error: { message: err.message } });
          }
          
          res.send({
            success: true,
            booking_id: this.lastID,
            stripe_transaction_id: stripeTransactionId,
            amount_paid: purchaseAmount
          });
        }
      );
      
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      
      // Handle card declined errors
      if (stripeError.code === 'card_declined') {
        return res.status(400).send({ 
          error: { 
            message: stripeError.message,
            code: 'card_declined'
          } 
        });
      }
      
      return res.status(400).send({ 
        error: { 
          message: stripeError.message,
          code: stripeError.code || 'payment_error'
        } 
      });
    }
  });
});

app.post('/create-payment-intent', async (req, res) => {
  const { currency } = req.body;

  // Create a PaymentIntent with the amount, currency, and a payment method type.
  // See the documentation [0] for the full list of supported parameters.
  // [0] https://stripe.com/docs/api/payment_intents/create
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1999,
      currency: currency,
    });

    // Send publishable key and PaymentIntent details to client
    res.send({
      clientSecret: paymentIntent.client_secret
    });

  } catch(e) {
    return res.status(400).send({
      error: {
        message: e.message
      }
    });
  }
});

// Expose a endpoint as a webhook handler for asynchronous events.
// Configure your webhook in the stripe developer dashboard
// https://dashboard.stripe.com/test/webhooks
app.post('/webhook', async (req, res) => {
  let data, eventType;

  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // we can retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === 'payment_intent.succeeded') {
    // Funds have been captured
    // Fulfill any orders, e-mail receipts, etc
    // To cancel the payment after capture you will need to issue a Refund (https://stripe.com/docs/api/refunds)
    console.log('💰 Payment captured!');
  } else if (eventType === 'payment_intent.payment_failed') {
    console.log('❌ Payment failed.');
  }
  res.sendStatus(200);
});

app.listen(4242, () => console.log(`Node server listening at http://localhost:4242`));

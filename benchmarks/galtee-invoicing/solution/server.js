// EVAL_LEAK_CHECK: galtee-invoicing-989ed5c1-54cd-4f29-8728-f022c20aaa63-solution
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();
require("dotenv").config({ path: "./.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

app.use(express.static(process.env.STATIC_DIR));
app.use(express.json());

const DB_PATH = path.join(__dirname, "../db/galtee_data.db");

// Product configuration
const PRODUCT_CONFIG = {
  fr_hike: {
    name: "French Alps hike",
    prices: {
      eur: 32500,
      usd: 35000,
      gbp: 30000,
    },
  },
  gb_hike: {
    name: "Great Britain hike",
    prices: {
      eur: 24000,
      gbp: 20000,
    },
  },
  painters_way: {
    name: "Painter's Way",
    prices: {
      eur: 100000,
      usd: 120000,
    },
  },
};

// Helper to get database connection
function getDb() {
  return new sqlite3.Database(DB_PATH);
}

// Helper to run async queries
function dbAll(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Get Stripe product ID for a given product
async function getStripeProductId(productId) {
  const products = await stripe.products.list({ limit: 100 });
  const product = products.data.find(
    (p) => p.metadata.product_id === productId
  );
  return product ? product.id : null;
}

// Get Stripe price ID for a product/currency combination
async function getStripePriceId(productId, currency) {
  const stripeProductId = await getStripeProductId(productId);
  if (!stripeProductId) return null;

  const prices = await stripe.prices.list({
    product: stripeProductId,
    limit: 100,
  });

  const price = prices.data.find((p) => p.currency === currency && p.active);
  return price ? price.id : null;
}

app.get("/products", async (req, res) => {
  try {
    const products = [];

    for (const [productId, config] of Object.entries(PRODUCT_CONFIG)) {
      const stripeProductId = await getStripeProductId(productId);

      products.push({
        id: productId,
        stripe_product_id: stripeProductId,
        prices: config.prices,
        name: config.name,
      });
    }

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/purchase", async (req, res) => {
  const { product, email, amount, currency, payment_method } = req.body;

  try {
    // Validate product and currency
    if (!PRODUCT_CONFIG[product]) {
      return res.status(400).json({ error: "Invalid product" });
    }

    if (!PRODUCT_CONFIG[product].prices[currency]) {
      return res
        .status(400)
        .json({ error: "Currency not supported for this product" });
    }

    // Create or retrieve customer
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: email,
      });
      customerId = newCustomer.id;
    }

    // Create payment method from token
    let paymentMethodId;
    try {
      const paymentMethodObj = await stripe.paymentMethods.create({
        type: "card",
        card: {
          token: payment_method,
        },
      });
      paymentMethodId = paymentMethodObj.id;

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      console.error("Error creating payment method:", error);
      // Return 200 but don't create booking for invalid payment methods
      return res.json({ error: "Invalid payment method" });
    }

    // Get Stripe price ID for this product/currency combination
    const stripePriceId = await getStripePriceId(product, currency);
    if (!stripePriceId) {
      return res
        .status(400)
        .json({ error: "Price not found for product/currency" });
    }

    // Create invoice with automatic payment collection to generate a PaymentIntent
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "charge_automatically",
      auto_advance: false,
      currency: currency,
    });

    // Add invoice item with pricing.price
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      pricing: {
        price: stripePriceId,
      },
    });

    let paymentIntentId = null;
    await stripe.invoices.finalizeInvoice(invoice.id);

    if (amount > 0) {
      // Pay the invoice
      try {
        await stripe.invoices.pay(invoice.id, {
          payment_method: paymentMethodId,
        });

        // Retrieve the invoice with expanded payments to get the payment_intent
        const paidInvoice = await stripe.invoices.retrieve(invoice.id, {
          expand: ['payments'],
        });

        // Extract payment_intent from the payments array
        if (paidInvoice.payments && paidInvoice.payments.data.length > 0) {
          const payment = paidInvoice.payments.data[0];
          if (payment.payment && payment.payment.payment_intent) {
            paymentIntentId = payment.payment.payment_intent;
          }
        }
      } catch (error) {
        console.error("Error paying invoice:", error.message);
        // Delete the invoice if payment fails
        await stripe.invoices.voidInvoice(invoice.id);
        return res.status(400).json({ error: "Payment failed" });
      }
    }

    // Insert booking into database
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    await dbRun(
      db,
      `
      INSERT INTO bookings (
        product_id, method, customer, amount_paid, currency,
        stripe_transaction_id, stripe_invoice_id, purchase_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        product,
        "online",
        email,
        amount,
        currency,
        paymentIntentId,
        invoice.id,
        today,
      ]
    );

    db.close();

    res.json({
      success: true,
      invoice_id: invoice.id,
      payment_intent_id: paymentIntentId,
    });
  } catch (error) {
    console.error("Error processing purchase:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/customer/:email/bookings", async (req, res) => {
  const { email } = req.params;

  try {
    const db = getDb();

    const bookings = await dbAll(
      db,
      `
      SELECT * FROM bookings WHERE customer = ?
    `,
      [email]
    );

    db.close();

    // Add status field to each booking
    const bookingsWithStatus = bookings.map((booking) => {
      const fullPrice =
        PRODUCT_CONFIG[booking.product_id].prices[booking.currency];
      const status =
        booking.amount_paid >= fullPrice ? "complete" : "incomplete";

      return {
        ...booking,
        status: status,
      };
    });

    res.json(bookingsWithStatus);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(4242, () =>
  console.log(`Node server listening at http://localhost:4242`)
);

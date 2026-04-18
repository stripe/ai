const express = require("express");
const app = express();
const { resolve } = require("path");
const env = require("dotenv").config({ path: "./.env" });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

app.use(express.static(process.env.STATIC_DIR));
app.use(express.json());

app.get("/config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get("/products", async (req, res) => {
  const products = [
    {
      id: "fr_hike",
      prices: { eur: 0 },
      stripe_product_id: "fake_prod_fr_hike_123",
    },
  ];

  res.json(products);
});

app.post("/purchase", async (req, res) => {
  const { product, email, amount, currency, payment_method } = req.body;

  try {
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

      // Also set as default for the customer so invoices can use it
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      console.error("Error creating payment method:", error);
      // Return 200 but don't create booking for invalid payment methods
      return res.json({ error: "Invalid payment method" });
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "charge_automatically",
      currency: currency,
    });

    // Create invoice item with inline pricing data to link product
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      price_data: {
         currency: currency,
         product_data: { name: product },
         unit_amount: amount
      }
    });

    let paymentIntentId = null;
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    if (amount > 0) {
      try {
        const paidInvoice = await stripe.invoices.pay(invoice.id, {
          payment_method: paymentMethodId,
        });
        paymentIntentId = paidInvoice.payment_intent;
      } catch (error) {
        console.error("Error paying invoice:", error.message);
        await stripe.invoices.voidInvoice(invoice.id);
        return res.status(400).json({ error: "Payment failed" });
      }
    }

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

app.listen(4242, () =>
  console.log(`Node server listening at http://localhost:4242`)
);

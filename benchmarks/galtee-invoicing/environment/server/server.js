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
  // TODO: implementation

  // This payment method call will likely be used as part of your implementation.
  // const paymentMethod = await stripe.paymentMethods.create({
  //   type: "card",
  //   card: {
  //     token payment_method,
  //   },
  // });
  res.status(501).json({ error: "Not implemented" });
});

app.listen(4242, () =>
  console.log(`Node server listening at http://localhost:4242`)
);

const express = require("express");
const path = require("path");
const app = express();
require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

const staticDir = process.env.STATIC_DIR
  ? path.resolve(__dirname, process.env.STATIC_DIR)
  : path.resolve(__dirname, "../client");

app.use(express.static(staticDir));
app.use(express.json());

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

function buildFallbackPaymentInstructions(product, amount = 0, currency = "eur") {
  const iban = "GB29NWBK60161331926819";
  const bic = "NWBKGB2L";
  const reference = `${product.toUpperCase()}-${Date.now()}`;
  const amountLabel = `${currency.toUpperCase()} ${((amount || 0) / 100).toFixed(2)}`;

  return {
    type: "bank_transfer",
    account_holder: "Galtee Adventures",
    iban,
    bic,
    reference,
    amount: amountLabel,
    message: `Pay ${amountLabel} for ${PRODUCT_CONFIG[product]?.name || product}`,
    qr_code_url: `https://api.qrserver.com/v1/create-qr-code?size=240x240&data=${encodeURIComponent(
      `IBAN:${iban}\nBIC:${bic}\nAMOUNT:${amountLabel}\nREFERENCE:${reference}`
    )}`,
  };
}

app.get("/config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

app.get("/products", async (req, res) => {
  try {
    const products = Object.entries(PRODUCT_CONFIG).map(([id, config]) => ({
      id,
      stripe_product_id: `prod_${id}`,
      prices: config.prices,
      name: config.name,
    }));

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/purchase", async (req, res) => {
  const { product, email, amount, currency, payment_method } = req.body;
  const amountCents = Number(amount || 0);
  const fallback = buildFallbackPaymentInstructions(product, amountCents, currency);

  try {
    if (!PRODUCT_CONFIG[product]) {
      return res.status(400).json({ success: false, error: "Invalid product", fallback });
    }

    if (!PRODUCT_CONFIG[product].prices[currency]) {
      return res.status(400).json({ success: false, error: "Currency not supported", fallback });
    }

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId =
      customers.data.length > 0
        ? customers.data[0].id
        : (await stripe.customers.create({ email })).id;

    let paymentMethodId = null;
    if (payment_method) {
      try {
        const paymentMethodObj = await stripe.paymentMethods.create({
          type: "card",
          card: {
            token: payment_method,
          },
        });
        paymentMethodId = paymentMethodObj.id;

        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (error) {
        console.error("Error creating payment method:", error.message || error);
        return res.status(200).json({
          success: false,
          error: "Invalid payment method",
          fallback,
        });
      }
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: amountCents > 0 ? "charge_automatically" : "send_invoice",
      auto_advance: false,
      currency,
    });

    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: PRODUCT_CONFIG[product].prices[currency],
      currency,
      description: PRODUCT_CONFIG[product].name,
    });

    await stripe.invoices.finalizeInvoice(invoice.id);
    const invoiceDetails = await stripe.invoices.retrieve(invoice.id);

    let paymentIntentId = null;
    if (amountCents > 0) {
      try {
        await stripe.invoices.pay(invoice.id, {
          payment_method: paymentMethodId,
        });

        const paidInvoice = await stripe.invoices.retrieve(invoice.id, {
          expand: ["payments"],
        });

        if (paidInvoice.payments && paidInvoice.payments.data.length > 0) {
          const payment = paidInvoice.payments.data[0];
          paymentIntentId = payment.payment?.payment_intent || payment.payment_intent;
        }
      } catch (error) {
        console.error("Error paying invoice:", error.message || error);
        return res.status(400).json({
          success: false,
          error: "Invoice payment failed",
          invoice_id: invoice.id,
          invoice_url: invoiceDetails.hosted_invoice_url,
          invoice_pdf: invoiceDetails.invoice_pdf,
          fallback,
        });
      }
    }

    res.json({
      success: true,
      invoice_id: invoice.id,
      invoice_url: invoiceDetails.hosted_invoice_url,
      invoice_pdf: invoiceDetails.invoice_pdf,
      payment_intent_id: paymentIntentId,
    });
  } catch (error) {
    console.error("Error processing purchase:", error);

    const response = {
      success: false,
      error: error.message || "Invoice generation failed",
      fallback,
    };

    if (error.type === "StripeInvalidRequestError" || error.type === "StripeCardError") {
      return res.status(200).json(response);
    }

    return res.status(500).json(response);
  }
});

app.listen(4242, () =>
  console.log(`Node server listening at http://localhost:4242`)
);

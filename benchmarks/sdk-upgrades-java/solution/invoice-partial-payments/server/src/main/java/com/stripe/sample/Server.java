// EVAL_LEAK_CHECK: sdk-upgrades-java-invoice-partial-payments-7c08d1f4-962c-4f27-b31f-4edd6a5149bc-solution
package com.stripe.sample;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.*;
import com.stripe.param.*;
import io.github.cdimascio.dotenv.Dotenv;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.json.JsonMapper;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Server {
    private static final Gson gson = new Gson();

    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.configure().directory("./").load();

        Stripe.apiKey = dotenv.get("STRIPE_SECRET_KEY");
        // Java SDK v29 uses API version 2025-03-31.basil

        Javalin app = Javalin.create(config -> {
            config.jsonMapper(new JsonMapper() {
                @NotNull
                @Override
                public String toJsonString(@NotNull Object obj, @NotNull java.lang.reflect.Type type) {
                    return gson.toJson(obj, type);
                }

                @NotNull
                @Override
                public <T> T fromJsonString(@NotNull String json, @NotNull java.lang.reflect.Type targetType) {
                    return gson.fromJson(json, targetType);
                }
            });
        }).start(4242);

        app.get("/config", Server::getConfig);
        app.get("/payment-intent-from-invoice", Server::getPaymentIntentFromInvoice);
        app.get("/check-out-of-band-payment", Server::checkOutOfBandPayment);
        app.get("/invoice-from-payment-intent", Server::getInvoiceFromPaymentIntent);
    }

    private static void getConfig(Context ctx) {
        Dotenv dotenv = Dotenv.configure().directory("./").load();
        Map<String, String> response = new HashMap<>();
        response.put("publishableKey", dotenv.get("STRIPE_PUBLISHABLE_KEY"));
        ctx.json(response);
    }

    // UPDATED: In basil API, invoice.payment_intent is removed.
    // Use InvoicePayment.list to find payments for the invoice.
    private static void getPaymentIntentFromInvoice(Context ctx) {
        String invoiceId = ctx.queryParam("invoice_id");

        if (invoiceId == null || invoiceId.isEmpty()) {
            ctx.status(400).json(Map.of("error", "invoice_id parameter is required"));
            return;
        }

        try {
            Invoice invoice = Invoice.retrieve(invoiceId);

            // Use InvoicePayment.list to get payments for this invoice
            InvoicePaymentListParams params = InvoicePaymentListParams.builder()
                .setInvoice(invoiceId)
                .addExpand("data.payment")
                .build();
            InvoicePaymentCollection invoicePayments = InvoicePayment.list(params);

            if (invoicePayments.getData().isEmpty()) {
                ctx.status(404).json(Map.of("error", "No payments found for this invoice"));
                return;
            }

            InvoicePayment invoicePayment = invoicePayments.getData().get(0);
            InvoicePayment.Payment payment = invoicePayment.getPayment();

            String paymentIntentId = payment != null ? payment.getPaymentIntent() : null;

            if (paymentIntentId == null) {
                ctx.status(404).json(Map.of("error", "No payment intent found for this invoice"));
                return;
            }

            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);

            Map<String, Object> response = new HashMap<>();
            response.put("invoiceId", invoice.getId());
            response.put("paymentIntentId", paymentIntent.getId());
            response.put("amount", paymentIntent.getAmount());
            response.put("status", paymentIntent.getStatus());
            response.put("currency", paymentIntent.getCurrency());
            response.put("created", paymentIntent.getCreated());
            response.put("clientSecret", paymentIntent.getClientSecret());

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // UPDATED: invoice.payment_intent and invoice.paid_out_of_band removed in basil.
    // Use InvoicePayment.list to check for payments.
    private static void checkOutOfBandPayment(Context ctx) {
        String invoiceId = ctx.queryParam("invoice_id");

        if (invoiceId == null || invoiceId.isEmpty()) {
            ctx.status(400).json(Map.of("error", "invoice_id parameter is required"));
            return;
        }

        try {
            Invoice invoice = Invoice.retrieve(invoiceId);

            // Use InvoicePayment.list to check for payments
            InvoicePaymentListParams params = InvoicePaymentListParams.builder()
                .setInvoice(invoiceId)
                .addExpand("data.payment")
                .build();
            InvoicePaymentCollection invoicePayments = InvoicePayment.list(params);

            boolean hasPaymentIntent = false;
            if (!invoicePayments.getData().isEmpty()) {
                InvoicePayment.Payment payment = invoicePayments.getData().get(0).getPayment();
                hasPaymentIntent = payment != null && payment.getPaymentIntent() != null;
            }

            // Check if paid without a payment (out of band)
            boolean isPaid = "paid".equals(invoice.getStatus());
            boolean hasNoPayments = invoicePayments.getData().isEmpty();
            boolean paidOutOfBand = isPaid && hasNoPayments;

            Map<String, Object> response = new HashMap<>();
            response.put("invoiceId", invoice.getId());
            response.put("status", invoice.getStatus());
            response.put("paid", isPaid);
            response.put("hasPaymentIntent", hasPaymentIntent);
            response.put("hasOutOfBandPayment", paidOutOfBand);
            response.put("amountPaid", invoice.getAmountPaid());
            response.put("amountDue", invoice.getAmountDue());
            response.put("paidOutOfBand", paidOutOfBand);

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // UPDATED: Use InvoicePayment.list to find invoices by payment intent.
    // Line item price is now at pricing.price_details.price
    private static void getInvoiceFromPaymentIntent(Context ctx) {
        String paymentIntentId = ctx.queryParam("payment_intent_id");

        if (paymentIntentId == null || paymentIntentId.isEmpty()) {
            ctx.status(400).json(Map.of("error", "payment_intent_id parameter is required"));
            return;
        }

        try {
            // Use InvoicePayment.list to find invoice by payment intent
            // In basil API, use nested payment parameter with type and payment_intent
            InvoicePaymentListParams params = InvoicePaymentListParams.builder()
                .setPayment(
                    InvoicePaymentListParams.Payment.builder()
                        .setType(InvoicePaymentListParams.Payment.Type.PAYMENT_INTENT)
                        .setPaymentIntent(paymentIntentId)
                        .build()
                )
                .addExpand("data.invoice")
                .build();

            InvoicePaymentCollection invoicePayments = InvoicePayment.list(params);

            if (invoicePayments.getData().isEmpty()) {
                ctx.status(404).json(Map.of("error", "No invoice found for this payment intent"));
                return;
            }

            InvoicePayment invoicePayment = invoicePayments.getData().get(0);

            // Get invoice ID
            String invoiceId = invoicePayment.getInvoiceObject() != null
                ? invoicePayment.getInvoiceObject().getId()
                : invoicePayment.getInvoice();

            // Fetch invoice with line item pricing expanded
            InvoiceRetrieveParams retrieveParams = InvoiceRetrieveParams.builder()
                .build();
            Invoice invoice = Invoice.retrieve(invoiceId, retrieveParams, null);

            List<Map<String, Object>> lineItems = new ArrayList<>();
            for (InvoiceLineItem item : invoice.getLines().getData()) {
                Map<String, Object> lineItem = new HashMap<>();
                lineItem.put("id", item.getId());
                lineItem.put("description", item.getDescription());
                lineItem.put("amount", item.getAmount());
                lineItem.put("currency", item.getCurrency());
                lineItem.put("quantity", item.getQuantity());

                // In basil API, price is at pricing.price_details.price
                // Note: item.getPrice() is removed in basil API
                String priceId = null;
                Long unitAmount = null;

                if (item.getPricing() != null) {
                    InvoiceLineItem.Pricing pricing = item.getPricing();
                    if (pricing.getPriceDetails() != null) {
                        InvoiceLineItem.Pricing.PriceDetails priceDetails = pricing.getPriceDetails();
                        // Get price ID from price_details.price (string ID)
                        priceId = priceDetails.getPrice();
                    }
                    // Get unit_amount_decimal from pricing level
                    if (pricing.getUnitAmountDecimal() != null) {
                        unitAmount = pricing.getUnitAmountDecimal().longValue();
                    }
                }

                lineItem.put("priceId", priceId);
                lineItem.put("unitAmount", unitAmount);

                lineItems.add(lineItem);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("paymentIntentId", paymentIntentId);
            response.put("invoiceId", invoice.getId());
            response.put("invoiceNumber", invoice.getNumber());
            response.put("status", invoice.getStatus());
            response.put("total", invoice.getTotal());
            response.put("subtotal", invoice.getSubtotal());
            response.put("amountDue", invoice.getAmountDue());
            response.put("amountPaid", invoice.getAmountPaid());
            response.put("lineItems", lineItems);

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }
}

package com.stripe.sample;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Invoice;
import com.stripe.model.InvoiceLineItem;
import com.stripe.model.PaymentIntent;
import com.stripe.param.InvoiceRetrieveParams;
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
        // Java SDK v27 uses API version 2022-08-01 by default

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
        Map<String, String> response = new HashMap<>();
        response.put("publishableKey", System.getenv("STRIPE_PUBLISHABLE_KEY"));
        ctx.json(response);
    }

    private static void getPaymentIntentFromInvoice(Context ctx) {
        String invoiceId = ctx.queryParam("invoice_id");
        
        if (invoiceId == null || invoiceId.isEmpty()) {
            ctx.status(400).json(Map.of("error", "invoice_id parameter is required"));
            return;
        }

        try {
            Invoice invoice = Invoice.retrieve(invoiceId);
            
            String paymentIntentId = invoice.getPaymentIntent();
            
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

    private static void checkOutOfBandPayment(Context ctx) {
        String invoiceId = ctx.queryParam("invoice_id");
        
        if (invoiceId == null || invoiceId.isEmpty()) {
            ctx.status(400).json(Map.of("error", "invoice_id parameter is required"));
            return;
        }

        try {
            Invoice invoice = Invoice.retrieve(invoiceId);

            boolean hasPaymentIntent = invoice.getPaymentIntent() != null;

            Map<String, Object> response = new HashMap<>();
            response.put("invoiceId", invoice.getId());
            response.put("status", invoice.getStatus());
            response.put("paid", invoice.getPaid());
            response.put("hasPaymentIntent", hasPaymentIntent);
            response.put("hasOutOfBandPayment", invoice.getPaidOutOfBand());
            response.put("amountPaid", invoice.getAmountPaid());
            response.put("amountDue", invoice.getAmountDue());
            response.put("paidOutOfBand", invoice.getPaidOutOfBand());

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    private static void getInvoiceFromPaymentIntent(Context ctx) {
        String paymentIntentId = ctx.queryParam("payment_intent_id");
        
        if (paymentIntentId == null || paymentIntentId.isEmpty()) {
            ctx.status(400).json(Map.of("error", "payment_intent_id parameter is required"));
            return;
        }

        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId);
            
            String invoiceId = paymentIntent.getInvoice();
            
            if (invoiceId == null) {
                ctx.status(404).json(Map.of("error", "No invoice found for this payment intent"));
                return;
            }

            InvoiceRetrieveParams params = InvoiceRetrieveParams.builder()
                .addExpand("lines.data.price")
                .build();
            Invoice invoice = Invoice.retrieve(invoiceId, params, null);

            List<Map<String, Object>> lineItems = new ArrayList<>();
            for (InvoiceLineItem item : invoice.getLines().getData()) {
                Map<String, Object> lineItem = new HashMap<>();
                lineItem.put("id", item.getId());
                lineItem.put("description", item.getDescription());
                lineItem.put("amount", item.getAmount());
                lineItem.put("currency", item.getCurrency());
                lineItem.put("quantity", item.getQuantity());
                
                if (item.getPrice() != null) {
                    lineItem.put("priceId", item.getPrice().getId());
                    lineItem.put("unitAmount", item.getPrice().getUnitAmount());
                }
                
                lineItems.add(lineItem);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("paymentIntentId", paymentIntent.getId());
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


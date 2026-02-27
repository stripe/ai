package com.stripe.sample;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.PaymentIntentRetrieveParams;
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
        // Stripe Java SDK v20 uses API version 2022-08-01 by default

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
        app.post("/create-payment-intent", Server::createPaymentIntent);
        app.get("/payment-details", Server::getPaymentDetails);
        app.get("/latest-charge-details", Server::getLatestChargeDetails);
        app.post("/check-payment-status", Server::checkPaymentStatus);
    }

    private static void getConfig(Context ctx) {
        Dotenv dotenv = Dotenv.configure().directory("./").load();
        Map<String, String> response = new HashMap<>();
        response.put("publishableKey", dotenv.get("STRIPE_PUBLISHABLE_KEY"));
        ctx.json(response);
    }

    private static void createPaymentIntent(Context ctx) {
        try {
            JsonObject requestBody = gson.fromJson(ctx.body(), JsonObject.class);
            
            long amount = requestBody.has("amount") ? requestBody.get("amount").getAsLong() : 2000;
            boolean confirm = requestBody.has("confirm") && requestBody.get("confirm").getAsBoolean();

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amount)
                .setCurrency("usd")
                .addPaymentMethodType("card")
                .setConfirm(confirm)
                .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            Map<String, String> response = new HashMap<>();
            response.put("clientSecret", paymentIntent.getClientSecret());
            response.put("paymentIntentId", paymentIntent.getId());
            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

    private static void getPaymentDetails(Context ctx) {
        try {
            String paymentIntentId = ctx.queryParam("payment_intent_id");

            PaymentIntentRetrieveParams params = PaymentIntentRetrieveParams.builder()
                .addExpand("charges")
                .build();

            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId, params, null);

            List<Map<String, Object>> chargesData = new ArrayList<>();
            for (Charge charge : paymentIntent.getCharges().getData()) {
                Map<String, Object> chargeMap = new HashMap<>();
                chargeMap.put("id", charge.getId());
                chargeMap.put("amount", charge.getAmount());
                chargeMap.put("status", charge.getStatus());
                chargeMap.put("receipt_url", charge.getReceiptUrl());
                chargesData.add(chargeMap);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("paymentIntentId", paymentIntent.getId());
            response.put("status", paymentIntent.getStatus());
            response.put("amount", paymentIntent.getAmount());
            response.put("charges", chargesData);
            response.put("chargeCount", paymentIntent.getCharges().getData().size());
            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

    private static void getLatestChargeDetails(Context ctx) {
        try {
            String paymentIntentId = ctx.queryParam("payment_intent_id");

            PaymentIntentRetrieveParams params = PaymentIntentRetrieveParams.builder()
                .addExpand("charges")
                .build();

            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId, params, null);

            if (!paymentIntent.getCharges().getData().isEmpty()) {
                Charge latestCharge = paymentIntent.getCharges().getData().get(0);

                Map<String, Object> response = new HashMap<>();
                response.put("chargeId", latestCharge.getId());
                response.put("amount", latestCharge.getAmount());
                response.put("paid", latestCharge.getPaid());
                response.put("refunded", latestCharge.getRefunded());
                response.put("failureMessage", latestCharge.getFailureMessage());
                ctx.json(response);
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "No charges found");
                ctx.json(error);
            }
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

    private static void checkPaymentStatus(Context ctx) {
        try {
            JsonObject requestBody = gson.fromJson(ctx.body(), JsonObject.class);
            String paymentIntentId = requestBody.get("payment_intent_id").getAsString();

            PaymentIntentRetrieveParams params = PaymentIntentRetrieveParams.builder()
                .addExpand("charges")
                .build();

            PaymentIntent paymentIntent = PaymentIntent.retrieve(paymentIntentId, params, null);

            boolean hasCharges = !paymentIntent.getCharges().getData().isEmpty();
            boolean hasSuccessfulCharge = false;
            for (Charge charge : paymentIntent.getCharges().getData()) {
                if ("succeeded".equals(charge.getStatus())) {
                    hasSuccessfulCharge = true;
                    break;
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("paymentIntentId", paymentIntent.getId());
            response.put("status", paymentIntent.getStatus());
            response.put("hasCharges", hasCharges);
            response.put("hasSuccessfulCharge", hasSuccessfulCharge);
            response.put("totalCharges", paymentIntent.getCharges().getData().size());
            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

}

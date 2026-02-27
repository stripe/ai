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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Server {
    private static final Gson gson = new Gson();

    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.configure().directory("./").load();
        
        Stripe.apiKey = dotenv.get("STRIPE_SECRET_KEY");

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
        app.get("/subscription-summary", Server::getSubscriptionSummary);
        app.get("/active-subscriptions", Server::getActiveSubscriptions);
        app.post("/subscription-metrics", Server::getSubscriptionMetrics);
        app.post("/billing-cycle-progress", Server::getBillingCycleProgress);
    }

    private static void getConfig(Context ctx) {
        Dotenv dotenv = Dotenv.configure().directory("./").load();
        Map<String, String> response = new HashMap<>();
        response.put("publishableKey", dotenv.get("STRIPE_PUBLISHABLE_KEY"));
        ctx.json(response);
    }

    private static void getSubscriptionSummary(Context ctx) {
        try {
            String subscriptionId = ctx.queryParam("subscription_id");

            Subscription subscription = Subscription.retrieve(subscriptionId);

            // Calculate billing period details
            Instant periodStart = Instant.ofEpochSecond(subscription.getCurrentPeriodStart());
            Instant periodEnd = Instant.ofEpochSecond(subscription.getCurrentPeriodEnd());
            long daysInPeriod = ChronoUnit.DAYS.between(periodStart, periodEnd);
            long daysRemaining = ChronoUnit.DAYS.between(Instant.now(), periodEnd);
            
            LocalDate startDate = periodStart.atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate endDate = periodEnd.atZone(ZoneId.systemDefault()).toLocalDate();
            
            Map<String, Object> billingPeriodDetails = new HashMap<>();
            billingPeriodDetails.put("startDate", startDate.toString());
            billingPeriodDetails.put("endDate", endDate.toString());
            billingPeriodDetails.put("totalDays", daysInPeriod);
            billingPeriodDetails.put("daysRemaining", Math.max(0, daysRemaining));
            billingPeriodDetails.put("percentComplete", 
                daysInPeriod > 0 ? Math.round((daysInPeriod - daysRemaining) * 100.0 / daysInPeriod * 100.0) / 100.0 : 0);

            SubscriptionItem firstItem = subscription.getItems().getData().get(0);
            Price price = firstItem.getPrice();

            Map<String, Object> response = new HashMap<>();
            response.put("subscriptionId", subscription.getId());
            response.put("customerId", subscription.getCustomer());
            response.put("status", subscription.getStatus());
            response.put("currentPeriodStart", subscription.getCurrentPeriodStart());
            response.put("currentPeriodEnd", subscription.getCurrentPeriodEnd());
            response.put("billingPeriodDetails", billingPeriodDetails);
            response.put("amount", price.getUnitAmount());
            response.put("interval", price.getRecurring().getInterval());

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

    private static void getActiveSubscriptions(Context ctx) {
        try {
            String customerId = ctx.queryParam("customer_id");

            SubscriptionListParams params = SubscriptionListParams.builder()
                .setCustomer(customerId)
                .setStatus(SubscriptionListParams.Status.ACTIVE)
                .addInclude("total_count") 
                .build();

            SubscriptionCollection subscriptions = Subscription.list(params);

            List<Map<String, Object>> subscriptionSummaries = new ArrayList<>();
            for (Subscription sub : subscriptions.getData()) {
                Map<String, Object> summary = new HashMap<>();
                summary.put("id", sub.getId());
                summary.put("status", sub.getStatus());
                summary.put("currentPeriodEnd", sub.getCurrentPeriodEnd());
                
                if (!sub.getItems().getData().isEmpty()) {
                    Price price = sub.getItems().getData().get(0).getPrice();
                    summary.put("amount", price.getUnitAmount());
                    summary.put("interval", price.getRecurring().getInterval());
                }
                
                subscriptionSummaries.add(summary);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("customerId", customerId);
            response.put("activeSubscriptions", subscriptionSummaries);
            response.put("totalCount", subscriptions.getTotalCount());  // Available when expanded
            response.put("hasMore", subscriptions.getHasMore());

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

    private static void getSubscriptionMetrics(Context ctx) {
        try {
            JsonObject requestBody = gson.fromJson(ctx.body(), JsonObject.class);
            String customerId = requestBody.get("customer_id").getAsString();

            SubscriptionListParams params = SubscriptionListParams.builder()
                .setCustomer(customerId)
                .addInclude("total_count")
                .build();

            SubscriptionCollection allSubs = Subscription.list(params);

            int activeCount = 0;
            int pastDueCount = 0;
            int canceledCount = 0;
            long totalMrr = 0;

            for (Subscription sub : allSubs.getData()) {
                String status = sub.getStatus();
                
                if ("active".equals(status)) {
                    activeCount++;
                    if (!sub.getItems().getData().isEmpty()) {
                        Price price = sub.getItems().getData().get(0).getPrice();
                        long amount = price.getUnitAmount() != null ? price.getUnitAmount() : 0;
                        String interval = price.getRecurring().getInterval();
                        
                        // Convert to MRR
                        if ("month".equals(interval)) {
                            totalMrr += amount;
                        } else if ("year".equals(interval)) {
                            totalMrr += Math.round(amount / 12.0);
                        } else {
                            totalMrr += amount;
                        }
                    }
                } else if ("past_due".equals(status)) {
                    pastDueCount++;
                } else if ("canceled".equals(status)) {
                    canceledCount++;
                }
            }

            Map<String, Integer> metrics = new HashMap<>();
            metrics.put("active", activeCount);
            metrics.put("pastDue", pastDueCount);
            metrics.put("canceled", canceledCount);

            Map<String, Object> response = new HashMap<>();
            response.put("customerId", customerId);
            response.put("totalSubscriptions", allSubs.getTotalCount());  // Available when expanded
            response.put("metrics", metrics);
            response.put("monthlyRecurringRevenue", totalMrr);
            response.put("averageSubscriptionValue", 
                activeCount > 0 ? Math.round((double) totalMrr / activeCount * 100.0) / 100.0 : 0);

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

    private static void getBillingCycleProgress(Context ctx) {
        try {
            JsonObject requestBody = gson.fromJson(ctx.body(), JsonObject.class);
            List<String> subscriptionIds = new ArrayList<>();
            
            requestBody.getAsJsonArray("subscription_ids").forEach(id -> 
                subscriptionIds.add(id.getAsString()));

            List<Map<String, Object>> results = new ArrayList<>();

            for (String subId : subscriptionIds) {
                Subscription subscription = Subscription.retrieve(subId);
                
                Instant periodStart = Instant.ofEpochSecond(subscription.getCurrentPeriodStart());
                Instant periodEnd = Instant.ofEpochSecond(subscription.getCurrentPeriodEnd());
                long daysInPeriod = ChronoUnit.DAYS.between(periodStart, periodEnd);
                long daysElapsed = ChronoUnit.DAYS.between(periodStart, Instant.now());

                Map<String, Object> result = new HashMap<>();
                result.put("subscriptionId", subId);
                result.put("status", subscription.getStatus());
                result.put("periodStart", subscription.getCurrentPeriodStart());
                result.put("periodEnd", subscription.getCurrentPeriodEnd());
                result.put("daysInPeriod", daysInPeriod);
                result.put("daysElapsed", daysElapsed);
                result.put("percentComplete", 
                    daysInPeriod > 0 ? Math.round((double) daysElapsed / daysInPeriod * 100 * 100.0) / 100.0 : 0);
                
                results.add(result);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("subscriptions", results);
            response.put("totalAnalyzed", results.size());

            ctx.json(response);
        } catch (StripeException e) {
            ctx.status(400);
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            ctx.json(error);
        }
    }

}

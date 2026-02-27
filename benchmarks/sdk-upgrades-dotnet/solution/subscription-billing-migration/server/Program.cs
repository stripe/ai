// EVAL_LEAK_CHECK: sdk-upgrades-dotnet-subscription-billing-migration-ad7e4461-df0d-4731-b1a9-b099c5ef3858-solution
using Microsoft.AspNetCore.Mvc;
using Stripe;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

// Load environment variables from .env file
Env.Load();

// Configure Stripe
StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
// Stripe.net v48 uses API version 2025-03-31.basil by default

var app = builder.Build();

app.MapGet("/config", () =>
{
    return Results.Json(new
    {
        publishableKey = Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY")
    });
});

// UPDATED: In basil API, current_period_start/end moved from subscription to subscription items
app.MapGet("/subscription-summary", async ([FromQuery(Name = "subscription_id")] string subscriptionId) =>
{
    try
    {
        var service = new SubscriptionService();
        var subscription = await service.GetAsync(subscriptionId);

        // In basil API, current_period_start/end are on subscription items, not subscription
        var firstItem = subscription.Items.Data[0];
        var currentPeriodStart = firstItem.CurrentPeriodStart;
        var currentPeriodEnd = firstItem.CurrentPeriodEnd;

        // Calculate billing period details
        var periodStart = currentPeriodStart;
        var periodEnd = currentPeriodEnd;
        var daysInPeriod = (periodEnd - periodStart).Days;
        var daysRemaining = Math.Max(0, (periodEnd - DateTime.UtcNow).Days);

        var billingPeriodDetails = new Dictionary<string, object>
        {
            ["startDate"] = periodStart.ToString("yyyy-MM-dd"),
            ["endDate"] = periodEnd.ToString("yyyy-MM-dd"),
            ["totalDays"] = daysInPeriod,
            ["daysRemaining"] = daysRemaining,
            ["percentComplete"] = daysInPeriod > 0
                ? Math.Round((daysInPeriod - daysRemaining) * 100.0 / daysInPeriod, 2)
                : 0
        };

        var price = firstItem.Price;

        return Results.Json(new
        {
            subscriptionId = subscription.Id,
            customerId = subscription.CustomerId,
            status = subscription.Status,
            currentPeriodStart = ((DateTimeOffset)currentPeriodStart).ToUnixTimeSeconds(),
            currentPeriodEnd = ((DateTimeOffset)currentPeriodEnd).ToUnixTimeSeconds(),
            billingPeriodDetails = billingPeriodDetails,
            amount = price.UnitAmount,
            interval = price.Recurring.Interval
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

// UPDATED: Removed AddExpand("total_count") - forbidden in basil API
// UPDATED: current_period_end is now on subscription items
app.MapGet("/active-subscriptions", async ([FromQuery(Name = "customer_id")] string customerId) =>
{
    try
    {
        var service = new SubscriptionService();
        // Don't use AddExpand("total_count") - it's forbidden in basil
        var options = new SubscriptionListOptions
        {
            Customer = customerId,
            Status = "active"
        };

        var subscriptions = await service.ListAsync(options);

        var subscriptionSummaries = subscriptions.Data.Select(sub =>
        {
            // Get current_period_end from subscription items
            var firstItem = sub.Items.Data.FirstOrDefault();
            return new
            {
                id = sub.Id,
                status = sub.Status,
                currentPeriodEnd = firstItem != null
                    ? ((DateTimeOffset)firstItem.CurrentPeriodEnd).ToUnixTimeSeconds()
                    : 0,
                amount = firstItem?.Price.UnitAmount,
                interval = firstItem?.Price.Recurring.Interval
            };
        }).ToList();

        return Results.Json(new
        {
            customerId = customerId,
            activeSubscriptions = subscriptionSummaries,
            totalCount = subscriptions.Data.Count,  // Count manually
            hasMore = subscriptions.HasMore
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

// UPDATED: Removed AddExpand("total_count") - forbidden in basil API
app.MapPost("/subscription-metrics", async (HttpContext context) =>
{
    try
    {
        var requestBody = await context.Request.ReadFromJsonAsync<Dictionary<string, string>>();
        var customerId = requestBody?["customer_id"];

        if (string.IsNullOrEmpty(customerId))
        {
            return Results.Json(new { error = "customer_id is required" }, statusCode: 400);
        }

        var service = new SubscriptionService();
        // Don't use AddExpand("total_count") - it's forbidden in basil
        // Must use "all" status to include canceled subscriptions
        var options = new SubscriptionListOptions
        {
            Customer = customerId,
            Status = "all",
            Limit = 100  // Fetch more to ensure we get all
        };

        var allSubs = await service.ListAsync(options);

        int activeCount = 0;
        int pastDueCount = 0;
        int canceledCount = 0;
        long totalMrr = 0;

        foreach (var sub in allSubs.Data)
        {
            switch (sub.Status)
            {
                case "active":
                    activeCount++;
                    if (sub.Items.Data.Any())
                    {
                        var price = sub.Items.Data[0].Price;
                        long amount = price.UnitAmount ?? 0;
                        string interval = price.Recurring.Interval;

                        // Convert to MRR
                        totalMrr += interval switch
                        {
                            "month" => amount,
                            "year" => (long)Math.Round(amount / 12.0),
                            _ => amount
                        };
                    }
                    break;
                case "past_due":
                    pastDueCount++;
                    break;
                case "canceled":
                    canceledCount++;
                    break;
            }
        }

        var metrics = new Dictionary<string, int>
        {
            ["active"] = activeCount,
            ["pastDue"] = pastDueCount,
            ["canceled"] = canceledCount
        };

        return Results.Json(new
        {
            customerId = customerId,
            totalSubscriptions = allSubs.Data.Count,  // Count manually
            metrics = metrics,
            monthlyRecurringRevenue = totalMrr,
            averageSubscriptionValue = activeCount > 0
                ? Math.Round((double)totalMrr / activeCount, 2)
                : 0
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

// UPDATED: current_period_start/end are now on subscription items
app.MapPost("/billing-cycle-progress", async (HttpContext context) =>
{
    try
    {
        var requestBody = await context.Request.ReadFromJsonAsync<Dictionary<string, List<string>>>();
        var subscriptionIds = requestBody?["subscription_ids"] ?? new List<string>();

        var service = new SubscriptionService();
        var results = new List<object>();

        foreach (var subId in subscriptionIds)
        {
            var subscription = await service.GetAsync(subId);

            // Get period from subscription items
            var firstItem = subscription.Items.Data[0];
            var periodStart = firstItem.CurrentPeriodStart;
            var periodEnd = firstItem.CurrentPeriodEnd;
            var daysInPeriod = (periodEnd - periodStart).Days;
            var daysElapsed = (DateTime.UtcNow - periodStart).Days;

            results.Add(new
            {
                subscriptionId = subId,
                status = subscription.Status,
                periodStart = ((DateTimeOffset)periodStart).ToUnixTimeSeconds(),
                periodEnd = ((DateTimeOffset)periodEnd).ToUnixTimeSeconds(),
                daysInPeriod = daysInPeriod,
                daysElapsed = daysElapsed,
                percentComplete = daysInPeriod > 0
                    ? Math.Round((double)daysElapsed / daysInPeriod * 100, 2)
                    : 0
            });
        }

        return Results.Json(new
        {
            subscriptions = results,
            totalAnalyzed = results.Count
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

app.Run("http://localhost:4242");

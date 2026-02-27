using Microsoft.AspNetCore.Mvc;
using Stripe;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

// Load environment variables from .env file
Env.Load();

// Configure Stripe
StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");

var app = builder.Build();

app.MapGet("/config", () =>
{
    return Results.Json(new
    {
        publishableKey = Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY")
    });
});

app.MapGet("/subscription-summary", async ([FromQuery(Name = "subscription_id")] string subscriptionId) =>
{
    try
    {
        var service = new SubscriptionService();
        var subscription = await service.GetAsync(subscriptionId);

        // Calculate billing period details
        var periodStart = subscription.CurrentPeriodStart;
        var periodEnd = subscription.CurrentPeriodEnd;
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

        var firstItem = subscription.Items.Data[0];
        var price = firstItem.Price;

        return Results.Json(new
        {
            subscriptionId = subscription.Id,
            customerId = subscription.CustomerId,
            status = subscription.Status,
            currentPeriodStart = ((DateTimeOffset)subscription.CurrentPeriodStart).ToUnixTimeSeconds(),
            currentPeriodEnd = ((DateTimeOffset)subscription.CurrentPeriodEnd).ToUnixTimeSeconds(),
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

app.MapGet("/active-subscriptions", async ([FromQuery(Name = "customer_id")] string customerId) =>
{
    try
    {
        var service = new SubscriptionService();
        var options = new SubscriptionListOptions
        {
            Customer = customerId,
            Status = "active"
        };
        options.AddInclude("total_count");

        var subscriptions = await service.ListAsync(options);

        var subscriptionSummaries = subscriptions.Data.Select(sub => new
        {
            id = sub.Id,
            status = sub.Status,
            currentPeriodEnd = sub.CurrentPeriodEnd,
            amount = sub.Items.Data.FirstOrDefault()?.Price.UnitAmount,
            interval = sub.Items.Data.FirstOrDefault()?.Price.Recurring.Interval
        }).ToList();

        return Results.Json(new
        {
            customerId = customerId,
            activeSubscriptions = subscriptionSummaries,
            totalCount = subscriptions.TotalCount,  // Available when expanded
            hasMore = subscriptions.HasMore
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

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
        var options = new SubscriptionListOptions
        {
            Customer = customerId
        };
        options.AddInclude("total_count");

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
            totalSubscriptions = allSubs.TotalCount,  // Available when expanded
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

            var periodStart = subscription.CurrentPeriodStart;
            var periodEnd = subscription.CurrentPeriodEnd;
            var daysInPeriod = (periodEnd - periodStart).Days;
            var daysElapsed = (DateTime.UtcNow - periodStart).Days;

            results.Add(new
            {
                subscriptionId = subId,
                status = subscription.Status,
                periodStart = ((DateTimeOffset)subscription.CurrentPeriodStart).ToUnixTimeSeconds(),
                periodEnd = ((DateTimeOffset)subscription.CurrentPeriodEnd).ToUnixTimeSeconds(),
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


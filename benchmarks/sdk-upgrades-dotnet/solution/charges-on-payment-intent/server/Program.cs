// EVAL_LEAK_CHECK: sdk-upgrades-dotnet-charges-on-payment-intent-e3bc2533-5e5b-4604-985f-2ac3cad94ee0-solution
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

app.MapPost("/create-payment-intent", async (HttpContext context) =>
{
    try
    {
        var service = new PaymentIntentService();
        long amount = 2000L;
        bool confirm = false;

        if (context.Request.ContentLength > 0)
        {
            var requestBody = await context.Request.ReadFromJsonAsync<Dictionary<string, object>>();
            if (requestBody != null)
            {
                if (requestBody.ContainsKey("amount"))
                {
                    amount = Convert.ToInt64(requestBody["amount"].ToString());
                }
                if (requestBody.ContainsKey("confirm"))
                {
                    confirm = Convert.ToBoolean(requestBody["confirm"].ToString());
                }
            }
        }

        var options = new PaymentIntentCreateOptions
        {
            Amount = amount,
            Currency = "usd",
            PaymentMethodTypes = new List<string> { "card" },
            Confirm = confirm
        };

        var paymentIntent = await service.CreateAsync(options);

        return Results.Json(new
        {
            clientSecret = paymentIntent.ClientSecret,
            paymentIntentId = paymentIntent.Id
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
    catch (Exception e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 500);
    }
});

// This endpoint retrieves a payment intent and accesses its charges
// In SDK v48+, paymentIntent.Charges was removed. Use Charge.List() instead.
app.MapGet("/payment-details", async ([FromQuery(Name = "payment_intent_id")] string paymentIntentId) =>
{
    try
    {
        var piService = new PaymentIntentService();
        var paymentIntent = await piService.GetAsync(paymentIntentId);

        // Use Charge.List() to get charges for this payment intent
        var chargeService = new ChargeService();
        var chargeListOptions = new ChargeListOptions
        {
            PaymentIntent = paymentIntentId
        };
        var charges = await chargeService.ListAsync(chargeListOptions);

        var chargesData = charges.Data.Select(charge => new
        {
            id = charge.Id,
            amount = charge.Amount,
            status = charge.Status,
            receipt_url = charge.ReceiptUrl
        }).ToList();

        return Results.Json(new
        {
            paymentIntentId = paymentIntent.Id,
            status = paymentIntent.Status,
            amount = paymentIntent.Amount,
            charges = chargesData,
            chargeCount = charges.Data.Count
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

app.MapGet("/latest-charge-details", async ([FromQuery(Name = "payment_intent_id")] string paymentIntentId) =>
{
    try
    {
        var piService = new PaymentIntentService();
        var options = new PaymentIntentGetOptions();
        options.AddExpand("latest_charge");
        var paymentIntent = await piService.GetAsync(paymentIntentId, options);

        // In Stripe.net v48+, LatestCharge is a Charge object when expanded
        var latestCharge = paymentIntent.LatestCharge;

        if (latestCharge != null)
        {
            return Results.Json(new
            {
                chargeId = latestCharge.Id,
                amount = latestCharge.Amount,
                paid = latestCharge.Paid,
                refunded = latestCharge.Refunded,
                failureMessage = latestCharge.FailureMessage
            });
        }
        else
        {
            return Results.Json(new { error = "No charges found" });
        }
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

app.MapPost("/check-payment-status", async (HttpContext context) =>
{
    try
    {
        var requestBody = await context.Request.ReadFromJsonAsync<Dictionary<string, string>>();
        var paymentIntentId = requestBody?["payment_intent_id"];

        if (string.IsNullOrEmpty(paymentIntentId))
        {
            return Results.Json(new { error = "payment_intent_id is required" }, statusCode: 400);
        }

        var piService = new PaymentIntentService();
        var paymentIntent = await piService.GetAsync(paymentIntentId);

        // Use Charge.List() to get charges for this payment intent
        var chargeService = new ChargeService();
        var chargeListOptions = new ChargeListOptions
        {
            PaymentIntent = paymentIntentId
        };
        var charges = await chargeService.ListAsync(chargeListOptions);

        var hasCharges = charges.Data.Any();
        var hasSuccessfulCharge = charges.Data.Any(c => c.Status == "succeeded");

        return Results.Json(new
        {
            paymentIntentId = paymentIntent.Id,
            status = paymentIntent.Status,
            hasCharges = hasCharges,
            hasSuccessfulCharge = hasSuccessfulCharge,
            totalCharges = charges.Data.Count
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
    catch (Exception e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 500);
    }
});

app.Run("http://localhost:4242");

using Microsoft.AspNetCore.Mvc;
using Stripe;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

// Load environment variables from .env file
Env.Load();

// Configure Stripe
StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
// Stripe.net v40 uses API version 2022-08-01 by default

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
app.MapGet("/payment-details", async ([FromQuery(Name = "payment_intent_id")] string paymentIntentId) =>
{
    try
    {
        var service = new PaymentIntentService();
        var options = new PaymentIntentGetOptions
        {
            Expand = new List<string> { "charges" }
        };

        var paymentIntent = await service.GetAsync(paymentIntentId, options);

        var chargesData = paymentIntent.Charges.Data.Select(charge => new
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
            chargeCount = paymentIntent.Charges.Data.Count
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
        var service = new PaymentIntentService();
        var options = new PaymentIntentGetOptions
        {
            Expand = new List<string> { "charges" }
        };

        var paymentIntent = await service.GetAsync(paymentIntentId, options);

        if (paymentIntent.Charges.Data.Any())
        {
            var latestCharge = paymentIntent.Charges.Data.First();

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

        var service = new PaymentIntentService();
        var options = new PaymentIntentGetOptions
        {
            Expand = new List<string> { "charges" }
        };

        var paymentIntent = await service.GetAsync(paymentIntentId, options);

        var hasCharges = paymentIntent.Charges.Data.Any();
        var hasSuccessfulCharge = paymentIntent.Charges.Data.Any(c => c.Status == "succeeded");

        return Results.Json(new
        {
            paymentIntentId = paymentIntent.Id,
            status = paymentIntent.Status,
            hasCharges = hasCharges,
            hasSuccessfulCharge = hasSuccessfulCharge,
            totalCharges = paymentIntent.Charges.Data.Count
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


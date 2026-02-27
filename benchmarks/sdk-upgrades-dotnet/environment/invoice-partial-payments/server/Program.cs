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

app.MapGet("/payment-intent-from-invoice", async ([FromQuery(Name = "invoice_id")] string invoiceId) =>
{
    if (string.IsNullOrEmpty(invoiceId))
    {
        return Results.Json(new { error = "invoice_id parameter is required" }, statusCode: 400);
    }

    try
    {
        var invoiceService = new InvoiceService();
        var invoice = await invoiceService.GetAsync(invoiceId);

        var paymentIntentId = invoice.PaymentIntentId;

        if (string.IsNullOrEmpty(paymentIntentId))
        {
            return Results.Json(new { error = "No payment intent found for this invoice" }, statusCode: 404);
        }

        var paymentIntentService = new PaymentIntentService();
        var paymentIntent = await paymentIntentService.GetAsync(paymentIntentId);

        return Results.Json(new
        {
            invoiceId = invoice.Id,
            paymentIntentId = paymentIntent.Id,
            amount = paymentIntent.Amount,
            status = paymentIntent.Status,
            currency = paymentIntent.Currency,
            created = new DateTimeOffset(paymentIntent.Created).ToUnixTimeSeconds(),
            clientSecret = paymentIntent.ClientSecret
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

app.MapGet("/check-out-of-band-payment", async ([FromQuery(Name = "invoice_id")] string invoiceId) =>
{
    if (string.IsNullOrEmpty(invoiceId))
    {
        return Results.Json(new { error = "invoice_id parameter is required" }, statusCode: 400);
    }

    try
    {
        var invoiceService = new InvoiceService();
        var invoice = await invoiceService.GetAsync(invoiceId);

        var hasPaymentIntent = !string.IsNullOrEmpty(invoice.PaymentIntentId);

        return Results.Json(new
        {
            invoiceId = invoice.Id,
            status = invoice.Status,
            paid = invoice.Paid,
            hasPaymentIntent = hasPaymentIntent,
            hasOutOfBandPayment = invoice.PaidOutOfBand,
            amountPaid = invoice.AmountPaid,
            amountDue = invoice.AmountDue,
            paidOutOfBand = invoice.PaidOutOfBand
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

app.MapGet("/invoice-from-payment-intent", async ([FromQuery(Name = "payment_intent_id")] string paymentIntentId) =>
{
    if (string.IsNullOrEmpty(paymentIntentId))
    {
        return Results.Json(new { error = "payment_intent_id parameter is required" }, statusCode: 400);
    }

    try
    {
        var paymentIntentService = new PaymentIntentService();
        var paymentIntent = await paymentIntentService.GetAsync(paymentIntentId);

        var invoiceId = paymentIntent.InvoiceId;

        if (string.IsNullOrEmpty(invoiceId))
        {
            return Results.Json(new { error = "No invoice found for this payment intent" }, statusCode: 404);
        }

        var invoiceService = new InvoiceService();
        var options = new InvoiceGetOptions();
        options.AddExpand("lines.data.price");
        var invoice = await invoiceService.GetAsync(invoiceId, options);

        var lineItems = new List<object>();
        foreach (var item in invoice.Lines.Data)
        {
            var lineItem = new Dictionary<string, object?>
            {
                ["id"] = item.Id,
                ["description"] = item.Description,
                ["amount"] = item.Amount,
                ["currency"] = item.Currency,
                ["quantity"] = item.Quantity
            };

            if (item.Price != null)
            {
                lineItem["priceId"] = item.Price.Id;
                lineItem["unitAmount"] = item.Price.UnitAmount;
            }

            lineItems.Add(lineItem);
        }

        return Results.Json(new
        {
            paymentIntentId = paymentIntent.Id,
            invoiceId = invoice.Id,
            invoiceNumber = invoice.Number,
            status = invoice.Status,
            total = invoice.Total,
            subtotal = invoice.Subtotal,
            amountDue = invoice.AmountDue,
            amountPaid = invoice.AmountPaid,
            lineItems = lineItems
        });
    }
    catch (StripeException e)
    {
        return Results.Json(new { error = e.Message }, statusCode: 400);
    }
});

app.Run("http://localhost:4242");


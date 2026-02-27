// EVAL_LEAK_CHECK: sdk-upgrades-dotnet-invoice-partial-payments-a5a50cf2-0f05-44f2-9540-b243c83c28a2-solution
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

// UPDATED: In basil API, invoice.PaymentIntentId was removed.
// Use InvoicePaymentService.List() to get payment intents from invoices.
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

        // Use InvoicePayment.List() to get payment intents (new basil API pattern)
        var invoicePaymentService = new InvoicePaymentService();
        var invoicePaymentListOptions = new InvoicePaymentListOptions
        {
            Invoice = invoiceId
        };
        invoicePaymentListOptions.AddExpand("data.payment");

        var invoicePayments = await invoicePaymentService.ListAsync(invoicePaymentListOptions);

        if (!invoicePayments.Data.Any())
        {
            return Results.Json(new { error = "No payment intent found for this invoice" }, statusCode: 404);
        }

        // Get the payment intent from the first invoice payment
        var invoicePayment = invoicePayments.Data.First();
        // PaymentIntent is expanded as object, access .Id for the ID, or use PaymentIntentId for string
        var paymentIntentObj = invoicePayment.Payment?.PaymentIntent;
        var paymentIntentIdStr = paymentIntentObj?.Id ?? invoicePayment.Payment?.PaymentIntentId;

        if (string.IsNullOrEmpty(paymentIntentIdStr))
        {
            return Results.Json(new { error = "No payment intent found for this invoice" }, statusCode: 404);
        }

        var paymentIntentService = new PaymentIntentService();
        var paymentIntent = await paymentIntentService.GetAsync(paymentIntentIdStr);

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

// UPDATED: invoice.PaidOutOfBand may not be available in basil API.
// Check if invoice is paid but has no payments to determine out-of-band payment.
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

        // Use InvoicePayment.List() to check for payments
        var invoicePaymentService = new InvoicePaymentService();
        var invoicePaymentListOptions = new InvoicePaymentListOptions
        {
            Invoice = invoiceId
        };
        invoicePaymentListOptions.AddExpand("data.payment");
        var invoicePayments = await invoicePaymentService.ListAsync(invoicePaymentListOptions);

        bool hasPaymentIntent = false;
        if (invoicePayments.Data.Any())
        {
            var payment = invoicePayments.Data.First().Payment;
            // PaymentIntent is an object when expanded, use PaymentIntentId for ID string
            hasPaymentIntent = payment != null && (payment.PaymentIntent != null || !string.IsNullOrEmpty(payment.PaymentIntentId));
        }

        // Check if paid without a payment (out of band)
        bool isPaid = invoice.Status == "paid";
        bool hasNoPayments = !invoicePayments.Data.Any();
        bool paidOutOfBand = isPaid && hasNoPayments;

        return Results.Json(new
        {
            invoiceId = invoice.Id,
            status = invoice.Status,
            paid = isPaid,
            hasPaymentIntent = hasPaymentIntent,
            hasOutOfBandPayment = paidOutOfBand,
            amountPaid = invoice.AmountPaid,
            amountDue = invoice.AmountDue,
            paidOutOfBand = paidOutOfBand
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
        // Use InvoicePayment.List() to find invoice by payment intent
        // Note: Can't expand more than 4 levels, so fetch invoice separately
        var invoicePaymentService = new InvoicePaymentService();
        var invoicePaymentListOptions = new InvoicePaymentListOptions
        {
            Payment = new InvoicePaymentPaymentOptions
            {
                Type = "payment_intent",
                PaymentIntent = paymentIntentId
            }
        };

        var invoicePayments = await invoicePaymentService.ListAsync(invoicePaymentListOptions);

        if (!invoicePayments.Data.Any())
        {
            return Results.Json(new { error = "No invoice found for this payment intent" }, statusCode: 404);
        }

        var invoicePayment = invoicePayments.Data.First();

        // Get invoice ID
        var invoiceId = invoicePayment.Invoice?.Id ?? invoicePayment.InvoiceId;

        // Fetch invoice with line item pricing expanded
        var invoiceService = new InvoiceService();
        var invoiceOptions = new InvoiceGetOptions();
        var invoice = await invoiceService.GetAsync(invoiceId, invoiceOptions);

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

            // Note: item.Price was removed in basil API
            string? priceId = null;
            long? unitAmount = null;

            if (item.Pricing != null)
            {
                if (item.Pricing.PriceDetails?.Price != null)
                {
                    priceId = item.Pricing.PriceDetails.Price;
                }
                // Get unit_amount_decimal from pricing level
                if (item.Pricing.UnitAmountDecimal != null)
                {
                    unitAmount = (long)item.Pricing.UnitAmountDecimal.Value;
                }
            }

            lineItem["priceId"] = priceId;
            lineItem["unitAmount"] = unitAmount;

            lineItems.Add(lineItem);
        }

        return Results.Json(new
        {
            paymentIntentId = paymentIntentId,
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

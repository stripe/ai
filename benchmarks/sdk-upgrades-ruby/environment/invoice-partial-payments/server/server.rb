require 'sinatra'
require 'stripe'
require 'json'
require 'dotenv'

Dotenv.load

Stripe.api_key = ENV['STRIPE_SECRET_KEY']

set :port, 4242

# Simple config endpoint for health checks
get '/config' do
  content_type 'application/json'
  {
    publishableKey: ENV['STRIPE_PUBLISHABLE_KEY']
  }.to_json
end

# Endpoint 1: Get payment intent details from an invoice
get '/payment-intent-from-invoice' do
  content_type 'application/json'
  
  begin
    invoice_id = params[:invoice_id]
    
    # Retrieve the invoice
    invoice = Stripe::Invoice.retrieve(invoice_id)
    
    # Get the payment intent from the invoice
    payment_intent_id = invoice.payment_intent
    
    if payment_intent_id
      payment_intent = Stripe::PaymentIntent.retrieve(payment_intent_id)
      
      {
        invoiceId: invoice.id,
        paymentIntentId: payment_intent.id,
        amount: payment_intent.amount,
        status: payment_intent.status,
        currency: payment_intent.currency,
        created: payment_intent.created,
        clientSecret: payment_intent.client_secret
      }.to_json
    else
      status 404
      { error: 'No payment intent associated with this invoice' }.to_json
    end
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Endpoint 2: Check if invoice has out-of-band payment
get '/check-out-of-band-payment' do
  content_type 'application/json'
  
  begin
    invoice_id = params[:invoice_id]
    
    # Retrieve the invoice
    invoice = Stripe::Invoice.retrieve(invoice_id)
    
    # Check if invoice has out-of-band payment
    {
      invoiceId: invoice.id,
      status: invoice.status,
      paid: invoice.paid,
      hasPaymentIntent: !invoice.payment_intent.nil?,
      hasOutOfBandPayment: invoice.paid_out_of_band,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      paidOutOfBand: invoice.paid_out_of_band
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Endpoint 3: Get invoice and line item details from payment intent
get '/invoice-from-payment-intent' do
  content_type 'application/json'
  
  begin
    payment_intent_id = params[:payment_intent_id]
    
    # Retrieve the payment intent
    payment_intent = Stripe::PaymentIntent.retrieve(payment_intent_id)
    
    # Get the invoice from the payment intent
    invoice_id = payment_intent.invoice
    
    if invoice_id
      invoice = Stripe::Invoice.retrieve(invoice_id, { expand: 'lines.data.price' })
      
      # Extract line item details with prices
      line_items = invoice.lines.data.map do |item|
        {
          id: item.id,
          description: item.description,
          amount: item.amount,
          currency: item.currency,
          quantity: item.quantity,
          priceId: item.price&.id,
          unitAmount: item.price&.unit_amount,
          recurring: item.price&.recurring
        }
      end
      
      {
        paymentIntentId: payment_intent.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        status: invoice.status,
        total: invoice.total,
        subtotal: invoice.subtotal,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        lineItems: line_items
      }.to_json
    else
      status 404
      { error: 'No invoice associated with this payment intent' }.to_json
    end
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end



# frozen_string_literal: true
# EVAL_LEAK_CHECK: sdk-upgrades-ruby-invoice-partial-payments-b8f99b7e-2b4c-4f8c-82ad-7c922686de83-solution
require 'sinatra'
require 'stripe'
require 'json'
require 'dotenv'

CURRENT_DIR = File.dirname(__FILE__)
Dotenv.load(File.join(CURRENT_DIR, '.env'))

Stripe.api_key = ENV['STRIPE_SECRET_KEY']
# Updated to new API version (from older pre-basil version)
Stripe.api_version = '2025-03-31.basil'

set :port, 4242

# Simple config endpoint for health checks
get '/config' do
  content_type 'application/json'
  {
    publishableKey: ENV['STRIPE_PUBLISHABLE_KEY']
  }.to_json
end

# Endpoint 1: Get payment intent details from an invoice
# UPDATED: In basil API, invoice.payment_intent is removed.
# Use InvoicePayment.list to find payments for the invoice.
get '/payment-intent-from-invoice' do
  content_type 'application/json'

  begin
    invoice_id = params[:invoice_id]

    # Retrieve the invoice
    invoice = Stripe::Invoice.retrieve(invoice_id)

    # Use InvoicePayment.list to get payments for this invoice
    invoice_payments = Stripe::InvoicePayment.list(
      invoice: invoice_id,
      expand: ['data.payment']
    )

    if invoice_payments.data.any?
      invoice_payment = invoice_payments.data.first
      payment = invoice_payment.payment

      # Extract payment_intent ID from the payment object
      payment_intent_id = if payment.respond_to?(:payment_intent)
                            payment.payment_intent
                          elsif payment.is_a?(String)
                            payment
                          end

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
    else
      status 404
      { error: 'No payments found for this invoice' }.to_json
    end
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Endpoint 2: Check if invoice has out-of-band payment
# UPDATED: invoice.payment_intent and invoice.paid_out_of_band removed in basil.
# Use InvoicePayment.list to check for payments.
get '/check-out-of-band-payment' do
  content_type 'application/json'

  begin
    invoice_id = params[:invoice_id]

    # Retrieve the invoice
    invoice = Stripe::Invoice.retrieve(invoice_id)

    # Use InvoicePayment.list to check for payments
    invoice_payments = Stripe::InvoicePayment.list(
      invoice: invoice_id,
      expand: ['data.payment']
    )

    has_payment_intent = false
    if invoice_payments.data.any?
      payment = invoice_payments.data.first.payment
      has_payment_intent = payment.respond_to?(:payment_intent) && !payment.payment_intent.nil?
    end

    # Check if paid without a payment (out of band)
    is_paid = invoice.status == 'paid'
    has_no_payments = invoice_payments.data.empty?
    paid_out_of_band = is_paid && has_no_payments

    {
      invoiceId: invoice.id,
      status: invoice.status,
      paid: is_paid,
      hasPaymentIntent: has_payment_intent,
      hasOutOfBandPayment: paid_out_of_band,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      paidOutOfBand: paid_out_of_band
    }.to_json
  rescue Stripe::StripeError => e
    status 400
    { error: e.message }.to_json
  end
end

# Endpoint 3: Get invoice and line item details from payment intent
# UPDATED: Use InvoicePayment.list to find invoices by payment intent.
# Line item price is now at pricing.price_details.price
get '/invoice-from-payment-intent' do
  content_type 'application/json'

  begin
    payment_intent_id = params[:payment_intent_id]

    # Search for invoice payments with this payment intent
    # In basil API, use nested payment parameter with type and payment_intent
    # Note: Can't expand more than 4 levels, so fetch invoice separately
    invoice_payments = Stripe::InvoicePayment.list(
      payment: {
        type: 'payment_intent',
        payment_intent: payment_intent_id
      },
      expand: ['data.invoice']
    )

    if invoice_payments.data.any?
      invoice_payment = invoice_payments.data.first
      invoice_obj = invoice_payment.invoice

      # Get invoice ID
      invoice_id = invoice_obj.is_a?(Stripe::Invoice) ? invoice_obj.id : invoice_obj

      # Fetch invoice with line item pricing expanded
      invoice = Stripe::Invoice.retrieve({
        id: invoice_id,
        expand: ['lines.data.pricing.price_details.price']
      })

      # Extract line item details with prices
      # In basil API, price is at pricing.price_details.price
      line_items = invoice.lines.data.map do |item|
        # Get price from new pricing structure
        price = nil
        price_id = nil
        unit_amount = nil
        recurring = nil

        if item.respond_to?(:pricing) && item.pricing
          pricing = item.pricing
          if pricing.respond_to?(:price_details) && pricing.price_details
            price_details = pricing.price_details
            if price_details.respond_to?(:price) && price_details.price
              price = price_details.price
              price_id = price.is_a?(String) ? price : price.id
              unit_amount = price.respond_to?(:unit_amount) ? price.unit_amount : nil
              recurring = price.respond_to?(:recurring) ? price.recurring : nil
            end
          end
          # Also check for unit_amount_decimal at pricing level
          unit_amount ||= pricing.unit_amount_decimal&.to_i
        end

        # Fallback to old-style price if pricing not available (backward compat)
        if price_id.nil? && item.respond_to?(:price) && item.price
          price_id = item.price.is_a?(String) ? item.price : item.price.id
          unit_amount ||= item.price.respond_to?(:unit_amount) ? item.price.unit_amount : nil
          recurring ||= item.price.respond_to?(:recurring) ? item.price.recurring : nil
        end

        {
          id: item.id,
          description: item.description,
          amount: item.amount,
          currency: item.currency,
          quantity: item.quantity,
          priceId: price_id,
          unitAmount: unit_amount,
          recurring: recurring
        }
      end

      {
        paymentIntentId: payment_intent_id,
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

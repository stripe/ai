# EVAL_LEAK_CHECK: sdk-upgrades-ruby-invoice-partial-payments-b8f99b7e-2b4c-4f8c-82ad-7c922686de83-grader
require_relative '../spec_helper'
require 'stripe'

RSpec.describe 'SDK Upgrade - Invoice Partial Payments' do
  before(:all) do
    # Set up Stripe
    Stripe.api_key = ENV['STRIPE_SECRET_KEY']
    Stripe.api_version = '2025-03-31.basil'
    
    # Create test data directly via Stripe API
    product = Stripe::Product.create(name: 'Test Service')
    price = Stripe::Price.create(
      product: product.id,
      unit_amount: 2500,
      currency: 'usd'
    )
    
    customer = Stripe::Customer.create(
      email: "test+#{Time.now.to_i}@example.com",
      name: 'Test Customer'
    )
    
    # Attach a test payment method
    payment_method = Stripe::PaymentMethod.create(
      type: 'card',
      card: { token: 'tok_visa' }
    )
    Stripe::PaymentMethod.attach(payment_method.id, { customer: customer.id })
    
    # Create the invoice
    invoice = Stripe::Invoice.create(
      customer: customer.id,
      default_payment_method: payment_method.id,
      auto_advance: false
    )
    
    # Create invoice item using new basil API
    Stripe::InvoiceItem.create(
      customer: customer.id,
      invoice: invoice.id,
      pricing: { price: price.id },
      description: 'Test service charge'
    )
    
    # Finalize to create payment intent
    invoice = Stripe::Invoice.finalize_invoice(invoice.id)
    
    # Pay the invoice so tests can run against a paid invoice
    Stripe::Invoice.pay(invoice.id)
    
    @invoice_id = invoice.id
    @customer_id = customer.id
    
    # Wait a moment for invoice to be fully processed
    sleep 1
    
    # In new basil API (with SDK 15+), use InvoicePayment.list() to access payment intents
    invoice_payments = Stripe::InvoicePayment.list({ 
      invoice: @invoice_id,
      expand: ['data.payment']
    })
    
    if invoice_payments.data.any?
      # The payment field contains a StripeObject with payment_intent and type
      invoice_payment = invoice_payments.data.first
      payment = invoice_payment.payment
      
      # Extract the payment_intent ID from the payment object
      if payment.respond_to?(:payment_intent)
        @payment_intent_id = payment.payment_intent
      elsif payment.is_a?(String)
        @payment_intent_id = payment
      end
    end
  end

  describe 'sdk version check passes' do
    it 'had to pass for these tests to run' do
      # automatically pass
      expect(true).to be_truthy
    end
  end

  describe 'GET /payment-intent-from-invoice' do
    it 'correctly retrieves payment intent details from an invoice' do
      response = make_request("/payment-intent-from-invoice?invoice_id=#{@invoice_id}", 'GET')
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['invoiceId']).to eq(@invoice_id)
      expect(body['paymentIntentId']).to eq(@payment_intent_id)
      expect(body['paymentIntentId']).to match(/^pi_/)
      expect(body['amount']).to be_a(Integer)
      expect(body['status']).to be_a(String)
      expect(body['currency']).to be_a(String)
      expect(body['created']).to be_a(Integer)
      expect(body['clientSecret']).to be_a(String)
    end
  end

  describe 'GET /check-out-of-band-payment' do
    it 'correctly checks if invoice has out-of-band payment status' do
      response = make_request("/check-out-of-band-payment?invoice_id=#{@invoice_id}", 'GET')
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['invoiceId']).to eq(@invoice_id)
      expect(body['status']).to be_a(String)
      expect([true, false]).to include(body['paid'])
      expect([true, false]).to include(body['hasPaymentIntent'])
      expect([true, false]).to include(body['hasOutOfBandPayment'])
      expect(body['amountPaid']).to be_a(Integer)
      expect(body['amountDue']).to be_a(Integer)
      expect([true, false]).to include(body['paidOutOfBand'])
      
      # For a regular invoice with payment intent, should not be out-of-band!
      expect(body['hasPaymentIntent']).to eq(true)
      expect(body['paidOutOfBand']).to eq(false)
    end
  end

  describe 'GET /invoice-from-payment-intent' do
    it 'retrieves invoice and line item details from payment intent' do
      response = make_request("/invoice-from-payment-intent?payment_intent_id=#{@payment_intent_id}", 'GET')
      
      expect(response.code).to eq('200')
      body = JSON.parse(response.body)
      
      # Verify response structure
      expect(body['paymentIntentId']).to eq(@payment_intent_id)
      expect(body['invoiceId']).to eq(@invoice_id)
      expect(body['invoiceNumber']).to be_a(String).or(be_nil)
      expect(body['status']).to be_a(String)
      expect(body['total']).to be_a(Integer)
      expect(body['subtotal']).to be_a(Integer)
      expect(body['amountDue']).to be_a(Integer)
      expect(body['amountPaid']).to be_a(Integer)
      
      # Verify line items structure
      expect(body['lineItems']).to be_an(Array)
      expect(body['lineItems'].length).to be > 0
      
      # Verify line item structure
      line_item = body['lineItems'].first
      expect(line_item['id']).to match(/^(il_|ii_)/)
      expect(line_item['description']).to be_a(String)
      expect(line_item['amount']).to be_a(Integer)
      expect(line_item['currency']).to be_a(String)
      expect(line_item['quantity']).to be_a(Integer)
      
      # Price fields should be present - verifying the old API pattern works
      expect(line_item['priceId']).to match(/^price_/)
      expect(line_item['unitAmount']).to be_a(Integer)
    end
  end
end

